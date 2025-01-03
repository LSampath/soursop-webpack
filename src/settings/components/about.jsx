import { Container } from '@mui/material';
import React from 'react';

const About = () => {
  return (
    <Container sx={{ p: 2, borderRadius: 2, backgroundColor: 'white' }}>
      <h1>About</h1>
      <p>This is a simple Digital Detox app to help you manage your time online.</p>
    </Container>
  );
};

export default About;