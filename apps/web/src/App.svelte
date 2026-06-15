<script lang="ts">
  import Nav from './components/Nav.svelte';
  import Footer from './components/Footer.svelte';
  import Hero from './sections/Hero.svelte';
  import Problem from './sections/Problem.svelte';
  import Shift from './sections/Shift.svelte';
  import HowItWorks from './sections/HowItWorks.svelte';
  import Benefits from './sections/Benefits.svelte';
  import Paradigm from './sections/Paradigm.svelte';
  import Runtime from './sections/Runtime.svelte';
  import Packages from './sections/Packages.svelte';
  import GetStarted from './sections/GetStarted.svelte';
</script>

<Nav />
<main>
  <Hero />
  <Problem />
  <Shift />
  <HowItWorks />
  <Benefits />
  <Paradigm />
  <Runtime />
  <Packages />
  <GetStarted />
</main>
<Footer />
