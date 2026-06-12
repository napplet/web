/**
 * VER-13 test: Cross-NAP invariant from specs/SHELL-CLASS-POLICY.md §Cross-NAP
 * Invariant scenario table.
 *
 * Canonical invariant (shell responsibility, enforced at class.assigned send
 * time, for shells implementing BOTH nap:class AND nap:connect):
 *
 *   class === 2 iff connect.granted === true
 *   class === 1 iff connect.granted === false
 *
 * Shells MUST NOT emit a state where `class === 2` AND `connect.granted === false`,
 * or where `class === 1` AND `connect.granted === true`. Both states are
 * non-conformant per the scenario table.
 *
 * This test enumerates all 7 rows from the scenario table (the 5 shell-
 * behavior rows + the 6th "nap:connect but not nap:class" row where the
 * invariant is not applicable + the 7th "future class-contributing NAPs"
 * extensibility row) and verifies the invariant holds for every conformant
 * row. Two anti-tests document the non-conformant states that the invariant
 * exists to prevent.
 */

import { describe, it, expect } from 'vitest';

// ─── Shell observable state ─────────────────────────────────────────────────

/**
 * The state a shell emits that is observable from the napplet frame.
 * This is a test-side simulation — the shell itself is out-of-process in
 * deployment, but the combination (classAssigned, connectGranted) is exactly
 * the surface a napplet's runtime reads via window.napplet.class + .connect.
 */
interface ShellObservableState {
  /** `class` field from the class.assigned envelope; undefined if shell never sent one. */
  classAssigned: number | undefined;
  /** window.napplet.connect.granted observed in the napplet (default false). */
  connectGranted: boolean;
  /** Whether the shell advertises nap:class via shell.supports('nap:class'). */
  napClassAdvertised: boolean;
  /** Whether the shell advertises nap:connect via shell.supports('nap:connect'). */
  napConnectAdvertised: boolean;
}

/**
 * The cross-NAP invariant per SHELL-CLASS-POLICY.md §Cross-NAP Invariant.
 *
 * Returns true if the observable state is conformant, false otherwise. The
 * invariant ONLY binds when BOTH nap:class AND nap:connect are advertised —
 * the POLICY-14 rule is scoped that way explicitly. Rows where one or both
 * NAPs are unimplemented are evaluated as "invariant does not apply,
 * therefore trivially conformant" and return true.
 *
 * For rows where both NAPs ARE advertised AND class is 1 or 2 (the two
 * classes the invariant constrains), the biconditional must hold. Class
 * values 3+ are owned by future NAP-CLASS-$N tracks and the connect
 * invariant does not constrain them.
 */
function invariantHolds(state: ShellObservableState): boolean {
  if (!state.napClassAdvertised || !state.napConnectAdvertised) {
    // Invariant only binds when both NAPs are advertised.
    return true;
  }
  if (state.classAssigned === 1 || state.classAssigned === 2) {
    // Biconditional: class === 2 iff connect.granted === true.
    return (state.classAssigned === 2) === (state.connectGranted === true);
  }
  // Class: undefined or Class: N (N >= 3) — connect invariant does not apply.
  return true;
}

// ─── Scenarios — mirrors SHELL-CLASS-POLICY.md §Scenario Table (7 rows) ─────

interface Scenario {
  name: string;
  state: ShellObservableState;
  /** Whether the biconditional class === 2 iff connect.granted applies to this row. */
  invariantApplies: boolean;
}

const scenarios: Scenario[] = [
  // Row 1: User approves Class-2 prompt (both NAPs advertised).
  {
    name: 'User approves Class-2 prompt',
    state: {
      classAssigned: 2,
      connectGranted: true,
      napClassAdvertised: true,
      napConnectAdvertised: true,
    },
    invariantApplies: true,
  },
  // Row 2: User denies Class-2 prompt (both NAPs advertised).
  {
    name: 'User denies Class-2 prompt',
    state: {
      classAssigned: 1,
      connectGranted: false,
      napClassAdvertised: true,
      napConnectAdvertised: true,
    },
    invariantApplies: true,
  },
  // Row 3: No connect tags (vanilla Class-1), both NAPs advertised.
  {
    name: 'No connect tags — vanilla Class-1',
    state: {
      classAssigned: 1,
      connectGranted: false,
      napClassAdvertised: true,
      napConnectAdvertised: true,
    },
    invariantApplies: true,
  },
  // Row 4: Shell does NOT implement nap:connect; class: 1 (or absent).
  // Test the advertised-class-1 branch ("or absent" is the other conformant
  // path and is covered by the unset-assignment case where classAssigned:
  // undefined and napConnectAdvertised: false).
  {
    name: 'Shell does NOT implement nap:connect',
    state: {
      classAssigned: 1,
      connectGranted: false, // default surface value
      napClassAdvertised: true,
      napConnectAdvertised: false,
    },
    invariantApplies: false, // POLICY-14 only binds when both advertised
  },
  // Row 5: Shell implements nap:class but not nap:connect; napplet declared
  // connect tags. Deployer chose the "treat-as-class-1" branch (the other
  // conformant branch is refuse-to-serve, which has no observable state).
  {
    name: 'Shell implements nap:class but not nap:connect (treat-as-class-1)',
    state: {
      classAssigned: 1,
      connectGranted: false,
      napClassAdvertised: true,
      napConnectAdvertised: false,
    },
    invariantApplies: false,
  },
  // Row 6: Shell implements nap:connect but not nap:class — no class envelope
  // sent, connect.granted may be true. Invariant not applicable (class side
  // is absent).
  {
    name: 'Shell implements nap:connect but not nap:class',
    state: {
      classAssigned: undefined,
      connectGranted: true,
      napClassAdvertised: false,
      napConnectAdvertised: true,
    },
    invariantApplies: false,
  },
  // Row 7: Future class-contributing NAPs (class: N beyond 1/2). Connect
  // invariant does not constrain class: 3+; that's the next sub-track's
  // responsibility.
  {
    name: 'Future class-contributing NAPs (class: N >= 3)',
    state: {
      classAssigned: 3,
      connectGranted: false,
      napClassAdvertised: true,
      napConnectAdvertised: true,
    },
    invariantApplies: false,
  },
];

// ─── Per-scenario invariant assertions ──────────────────────────────────────

describe.each(scenarios)(
  'SHELL-CLASS-POLICY cross-NAP invariant (VER-13): $name',
  ({ state, invariantApplies }) => {
    it('invariant holds for this scenario (class === 2 iff connect.granted === true, when applicable)', () => {
      expect(invariantHolds(state)).toBe(true);
    });

    it('invariant applicability matches the scenario construction', () => {
      // Meta-assertion: the invariantApplies flag is derivable from the state
      // shape. A row "applies" exactly when both NAPs are advertised AND the
      // assigned class is 1 or 2. Any drift between the table and the flag is
      // a bookkeeping bug the test surfaces immediately.
      const derived =
        state.napClassAdvertised &&
        state.napConnectAdvertised &&
        (state.classAssigned === 1 || state.classAssigned === 2);
      expect(derived).toBe(invariantApplies);
    });
  }
);

// ─── Anti-tests: documented non-conformant states per POLICY-14 ─────────────

describe('cross-NAP invariant: REJECTS non-conformant shell states (VER-13)', () => {
  it('REJECTS class === 2 AND connect.granted === false', () => {
    const nonConformant: ShellObservableState = {
      classAssigned: 2,
      connectGranted: false,
      napClassAdvertised: true,
      napConnectAdvertised: true,
    };
    expect(invariantHolds(nonConformant)).toBe(false);
  });

  it('REJECTS class === 1 AND connect.granted === true', () => {
    const nonConformant: ShellObservableState = {
      classAssigned: 1,
      connectGranted: true,
      napClassAdvertised: true,
      napConnectAdvertised: true,
    };
    expect(invariantHolds(nonConformant)).toBe(false);
  });

  it('ACCEPTS non-conformant-shape when only one NAP is advertised (invariant does not bind)', () => {
    // Same visible shape as the first anti-test, but with nap:connect NOT
    // advertised. Per POLICY-14 scoping, the invariant does NOT apply — the
    // row is trivially conformant because the biconditional is not checked.
    const onlyClassAdvertised: ShellObservableState = {
      classAssigned: 2,
      connectGranted: false,
      napClassAdvertised: true,
      napConnectAdvertised: false,
    };
    expect(invariantHolds(onlyClassAdvertised)).toBe(true);
  });

  it('ACCEPTS class: undefined when only nap:connect is advertised', () => {
    // Row 6 of the scenario table made explicit: no class envelope sent,
    // connect.granted may be either value; the invariant does not bind.
    const onlyConnectAdvertised: ShellObservableState = {
      classAssigned: undefined,
      connectGranted: true,
      napClassAdvertised: false,
      napConnectAdvertised: true,
    };
    expect(invariantHolds(onlyConnectAdvertised)).toBe(true);
  });
});

// ─── Meta-test: scenario table coverage ─────────────────────────────────────

describe('cross-NAP invariant: scenario table coverage', () => {
  it('covers all 7 SHELL-CLASS-POLICY.md scenario rows', () => {
    expect(scenarios.length).toBe(7);
  });

  it('at least one scenario exercises each (advertised, assigned-class) quadrant', () => {
    // Smoke check that the seven rows together cover the full cross-product
    // surface, not a single branch.
    const hasBothAdvertisedClass2 = scenarios.some(
      (s) =>
        s.state.napClassAdvertised &&
        s.state.napConnectAdvertised &&
        s.state.classAssigned === 2
    );
    const hasBothAdvertisedClass1 = scenarios.some(
      (s) =>
        s.state.napClassAdvertised &&
        s.state.napConnectAdvertised &&
        s.state.classAssigned === 1
    );
    const hasOnlyClassAdvertised = scenarios.some(
      (s) => s.state.napClassAdvertised && !s.state.napConnectAdvertised
    );
    const hasOnlyConnectAdvertised = scenarios.some(
      (s) => !s.state.napClassAdvertised && s.state.napConnectAdvertised
    );
    expect(hasBothAdvertisedClass2).toBe(true);
    expect(hasBothAdvertisedClass1).toBe(true);
    expect(hasOnlyClassAdvertised).toBe(true);
    expect(hasOnlyConnectAdvertised).toBe(true);
  });
});
