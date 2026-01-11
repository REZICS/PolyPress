import {Route, Router} from 'wouter';
import {lazy} from 'react';

const Home = lazy(() => import('@/page/Home'));
const About = lazy(() => import('@/page/About'));
const WorkSpace = lazy(() => import('@/page/WorkSpace'));
const Theme = lazy(() => import('@/page/Theme'));

export default (
  <Router>
    <Route path="/">
      <Home />
    </Route>

    <Route path="/about">
      <About />
    </Route>

    <Route path="/workspace">
      <WorkSpace />
    </Route>

    <Route path="/theme">
      <Theme />
    </Route>
  </Router>
);
