import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import MainMenu from './views/MainMenu.js';
import ListView from './views/ListView.js';
import AddView from './views/AddView.js';
import SyncView from './views/SyncView.js';
import DetailView from './views/DetailView.js';
import CleanView from './views/CleanView.js';

const { createElement: h } = React;

const VIEWS = {
  MENU: 'menu',
  LIST: 'list',
  ADD: 'add',
  SYNC: 'sync',
  DETAIL: 'detail',
  CLEAN: 'clean'
};

export default function App() {
  const { exit } = useApp();
  const [view, setView] = useState(VIEWS.MENU);
  const [selectedKey, setSelectedKey] = useState(null);
  const [message, setMessage] = useState(null);

  const showMessage = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 2000);
  };

  const goToMenu = () => setView(VIEWS.MENU);
  const goToList = () => setView(VIEWS.LIST);
  const goToAdd = () => setView(VIEWS.ADD);
  const goToSync = () => setView(VIEWS.SYNC);
  const goToClean = () => setView(VIEWS.CLEAN);
  const goToDetail = (key) => {
    setSelectedKey(key);
    setView(VIEWS.DETAIL);
  };

  useInput((input, key) => {
    if (input === 'q' && view === VIEWS.MENU) {
      exit();
    }
  });

  return h(Box, { flexDirection: 'column', padding: 1 },
    // Header
    h(Box, { marginBottom: 1 },
      h(Text, { bold: true, color: 'cyan' }, 'evk'),
      h(Text, { color: 'gray' }, ' - Environment Variable Manager')
    ),

    // Message
    message && h(Box, { marginBottom: 1 },
      h(Text, { color: message.type === 'success' ? 'green' : message.type === 'error' ? 'red' : 'yellow' },
        (message.type === 'success' ? '✓' : message.type === 'error' ? '✗' : '!') + ' ' + message.text
      )
    ),

    // Views
    view === VIEWS.MENU && h(MainMenu, { onList: goToList, onAdd: goToAdd, onSync: goToSync, onClean: goToClean, onExit: exit }),
    view === VIEWS.LIST && h(ListView, { onBack: goToMenu, onSelect: goToDetail, onAdd: goToAdd, showMessage }),
    view === VIEWS.ADD && h(AddView, { onBack: goToList, onCancel: goToMenu, showMessage }),
    view === VIEWS.SYNC && h(SyncView, { onBack: goToMenu, showMessage }),
    view === VIEWS.CLEAN && h(CleanView, { onBack: goToMenu, showMessage }),
    view === VIEWS.DETAIL && h(DetailView, { varKey: selectedKey, onBack: goToList, showMessage }),

    // Footer
    h(Box, { marginTop: 1, borderStyle: 'single', borderColor: 'gray', paddingX: 1 },
      h(Text, { color: 'gray' }, view === VIEWS.MENU ? 'Press q to quit' : 'Press Esc to go back')
    )
  );
}
