#!/usr/bin/env python3
"""Record real CLI PTY output. Requires Unix, Python 3 and Deno; no public deployment."""
import argparse
import codecs
import errno
import fcntl
import json
import os
from pathlib import Path
import pty
import re
import secrets
import select
import signal
import struct
import subprocess
import tempfile
import termios
import time
import urllib.request

ANSI = re.compile(r'\x1b\[[0-?]*[ -/]*[@-~]')

class Session:
    def __init__(self, binary, args, cwd, env, columns=100, rows=48):
        self.started = time.monotonic()
        self.events = []
        self.decoder = codecs.getincrementaldecoder("utf-8")()
        self.text = ''
        self.code = None
        self.columns, self.rows = columns, rows
        self.pid, self.fd = pty.fork()
        if self.pid == 0:
            os.chdir(cwd)
            os.execve(str(binary), [str(binary), *args], env)
        fcntl.ioctl(self.fd, termios.TIOCSWINSZ, struct.pack('HHHH', rows, columns, 0, 0))

    def read(self):
        ready, _, _ = select.select([self.fd], [], [], 0.1)
        if ready:
            try:
                chunk = os.read(self.fd, 65536)
            except OSError as error:
                if error.errno != errno.EIO:
                    raise
                chunk = b''
            if chunk:
                text = self.decoder.decode(chunk)
                self.text += text
                self.events.append([round(time.monotonic() - self.started, 4), 'o', text])
        pid, status = os.waitpid(self.pid, os.WNOHANG)
        if pid:
            self.code = os.waitstatus_to_exitcode(status)

    def until(self, value, timeout=20):
        end = time.monotonic() + timeout
        while value not in ANSI.sub('', self.text):
            if self.code is not None or time.monotonic() > end:
                raise RuntimeError(f'CLI did not reach {value!r}: {self.text[-1800:]}')
            self.read()

    def send(self, value):
        os.write(self.fd, value.encode())

    def finish(self, timeout=20):
        end = time.monotonic() + timeout
        while self.code is None:
            if time.monotonic() > end:
                os.kill(self.pid, signal.SIGTERM)
                raise RuntimeError('CLI failed to exit; possible blocked prompt')
            self.read()
        os.close(self.fd)
        return self.code

    def snapshot(self, directory, name):
        (directory / f'{name}.ansi').write_text(self.text)
        (directory / f'{name}.cast').write_text('\n'.join(json.dumps(item) for item in [
            {'version': 2, 'width': self.columns, 'height': self.rows, 'env': {'TERM': 'xterm-256color'}},
            *self.events,
        ]) + '\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    binary, out = args.binary.resolve(), args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, TERM='xterm-256color')
    for key in ['NO_COLOR', 'CI', 'NAPPLET_CI_SIGNING_KEY', 'NAPPLET_CI_KEY_REFERENCE']:
        env.pop(key, None)
    fixture = Path(__file__).with_name('server.ts').resolve()
    server = subprocess.Popen(['deno', 'run', '--no-config', '--allow-net=127.0.0.1', str(fixture)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        addresses = json.loads(server.stdout.readline())
        with tempfile.TemporaryDirectory(prefix='napplet-cli-proof-') as root:
            work = Path(root)
            (work / '.napplet').mkdir()
            (work / 'index.html').write_text('<!doctype html><html><head><title>Notes</title></head><body><h1>Notes</h1></body></html>')
            path = work / '.napplet/config.yaml'
            path.write_text('version: 1\nsourceDir: .\nnamed: [notes]\nmetadata:\n  title: Notes\n  source: false\n')
            help_session = Session(binary, ['--help'], work, env, rows=64)
            assert help_session.finish() == 0
            help_session.snapshot(out, '01-help')
            deploy = Session(binary, ['deploy', '--format', 'current', '--prompt-sec'], work, env)
            deploy.until('Description for')
            deploy.send('A private notebook for quick ideas.\n')
            deploy.until('Relay URLs (comma separated)')
            deploy.send(addresses['relay'] + '\n')
            deploy.until('Blossom server origins (comma separated)')
            deploy.send(', '.join(addresses['servers']) + '\n')
            deploy.until('Save these settings')
            deploy.send('yes\n')
            deploy.until('Enter signing secret')
            deploy.snapshot(out, '02-guided-setup')
            ephemeral = secrets.token_hex(32)
            deploy.send(ephemeral + '\n')
            deploy.until('50%')
            deploy.snapshot(out, '03-upload-progress')
            assert deploy.finish() == 0, deploy.text
            assert ephemeral not in deploy.text, 'Hidden signing input leaked into transcript'
            deploy.snapshot(out, '04-deployment-result')
            saved = path.read_text()
            assert 'title: Notes' in saved
            assert 'description: A private notebook for quick ideas.' in saved
            assert 'secret' not in path.read_text()
            assert ephemeral not in path.read_text(), 'Signing input leaked into saved configuration'
            with urllib.request.urlopen(addresses['servers'][0] + '/stats') as response:
                stats = json.load(response)
            assert len(stats['uploads']) == 2 and len(stats['events']) == 1, stats
            assert stats['uploads'][0]['sha256'] == stats['uploads'][1]['sha256']
            (out / 'network-evidence.json').write_text(json.dumps(stats, indent=2) + '\n')
            result = subprocess.run([str(binary), 'deploy', '-i', '--dry-run', '--json'], cwd=work, env=env, capture_output=True, text=True, timeout=20)
            assert result.returncode == 0, result.stderr
            json.loads(result.stdout)
            assert '\x1b' not in result.stdout and not result.stdout.startswith('napplet')
            (out / 'machine-output.json').write_text(result.stdout)
            path.write_text('version: 1\nsourceDir: .\nnamed: [notes]\nmetadata:\n  title: Notes\n  source: false\n')
            noninteractive = Session(binary, ['deploy', '-i', '--format', 'current'], work, env, rows=30)
            assert noninteractive.finish(timeout=10) == 1
            assert 'Deployment needs configuration' in noninteractive.text
            assert '? Description' not in noninteractive.text
            noninteractive.snapshot(out, '05-non-interactive')
            ci = Session(binary, ['deploy', '--format', 'current'], work, dict(env, CI='true'), rows=30)
            assert ci.finish(timeout=10) == 1
            assert '? Description' not in ci.text
            plain = Session(binary, ['deploy', '--help'], work, dict(env, NO_COLOR='1'), rows=40)
            assert plain.finish() == 0
            assert '\x1b' not in plain.text
            plain.snapshot(out, '06-no-color')
            cancelled = Session(binary, ['deploy', '--format', 'current'], work, env)
            cancelled.until('Description for')
            cancelled.send('\x03')
            assert cancelled.finish() == 130
            assert 'Prompt cancelled' in cancelled.text
            (out / 'verification.json').write_text(json.dumps({'interactiveDeploy': 'passed', 'uploadedMirrors': 2, 'publishedEvents': 1, 'hiddenSecret': 'not echoed or saved', 'partialConfig': 'completed and preserved', 'nonInteractiveTTY': 'exit 1 without prompting', 'ciTTY': 'exit 1 without prompting', 'machineJSON': 'parseable and ANSI-free', 'noColorTTY': 'ANSI-free', 'ctrlC': 'exit 130', 'publicNetwork': 'none; loopback fixtures only'}, indent=2) + '\n')
            print(f'CLI terminal proof passed: {out}')
    finally:
        server.terminate()
        server.wait(timeout=5)

if __name__ == '__main__':
    main()
