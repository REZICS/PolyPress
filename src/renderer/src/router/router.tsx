import {ThemeProvider} from '@mui/material';
import {Route, Router, Switch} from 'wouter';
import {lazy} from 'react'

const Home = lazy(() => import('@/page/Home'));
const About = lazy(() => import('@/page/About'));

export default (
  <Router>
    <Route path="/" component={Home} />
    <Route path="/about" component={About} />
  </Router>
);
