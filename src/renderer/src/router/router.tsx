import {Route, Router} from 'wouter';
import {lazy} from 'react';

const Home = lazy(() => import('@/page/Home'));
const About = lazy(() => import('@/page/About'));
const WorkSpace = lazy(() => import('@/page/WorkSpace'));

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
  </Router>
);
