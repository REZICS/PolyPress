import {ThemeProvider} from '@mui/material';
import {Route, Router, Switch} from 'wouter';
import {lazy} from 'react';
import MainLayout from '@/layout/MainLayout';

const Home = lazy(() => import('@/page/Home'));
const About = lazy(() => import('@/page/About'));

export default (
  <Router>
    <Route path="/">
      <MainLayout>
        <Home />
      </MainLayout>
    </Route>

    <Route path="/about">
      <MainLayout>
        <About />
      </MainLayout>
    </Route>
  </Router>
);
