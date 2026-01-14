import React from 'react';
import { render } from 'ink';
import App from './App.js';
import { storeExists, initStore } from '../core/store.js';

export function startTUI() {
  // Auto-init if not exists
  if (!storeExists()) {
    initStore();
    console.log('✓ Initialized evk\n');
  }

  render(React.createElement(App));
}
