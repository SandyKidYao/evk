import React, { useState, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import MainMenu from './views/MainMenu.js';
import ListView from './views/ListView.js';
import AddView from './views/AddView.js';
import SyncView from './views/SyncView.js';
import DetailView from './views/DetailView.js';
import CleanView from './views/CleanView.js';
import ImportView from './views/ImportView.js';
import Banner from './components/Banner.js';
import { colors, icons } from './theme.js';

const { createElement: h } = React;
const VERSION = '0.5.0';

const VIEWS = {
  MENU: 'menu',
  LIST: 'list',
  ADD: 'add',
  SYNC: 'sync',
  DETAIL: 'detail',
  CLEAN: 'clean',
  IMPORT: 'import'
};

export default function App() {
  const { exit } = useApp();
  const [view, setView] = useState(VIEWS.MENU);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState(null);
  const [footerHints, setFooterHints] = useState([]);

  const showMessage = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 2500);
  };

  const goToMenu = () => {
    setView(VIEWS.MENU);
    setFooterHints([]);
  };
  const goToList = () => setView(VIEWS.LIST);
  const goToAdd = () => setView(VIEWS.ADD);
  const goToSync = () => setView(VIEWS.SYNC);
  const goToClean = () => setView(VIEWS.CLEAN);
  const goToImport = () => setView(VIEWS.IMPORT);
  const goToDetail = (id) => {
    setSelectedId(id);
    setView(VIEWS.DETAIL);
  };

  // Memoize setFooterHints to avoid unnecessary re-renders
  const updateFooterHints = useCallback((hints) => {
    setFooterHints(hints);
  }, []);

  useInput((input, key) => {
    if (key.escape && view === VIEWS.MENU) {
      exit();
    }
  });

  // Get message styling
  const getMessageStyle = (type) => {
    switch (type) {
      case 'success': return { color: colors.success, icon: icons.success };
      case 'error': return { color: colors.error, icon: icons.error };
      case 'warning': return { color: colors.warning, icon: icons.warning };
      default: return { color: colors.text, icon: icons.info };
    }
  };

  // Footer content - show message, hints, or default
  const FooterContent = () => {
    // Message takes priority
    if (message) {
      const style = getMessageStyle(message.type);
      return h(Text, { color: style.color, bold: true },
        `${style.icon} ${message.text}`
      );
    }

    // Build hints display
    const parts = [];

    // Add view-specific hints
    if (footerHints.length > 0) {
      footerHints.forEach((hint, i) => {
        if (i > 0) parts.push(h(Text, { key: `sep-${i}`, color: colors.textMuted }, '  '));
        parts.push(h(Text, { key: `key-${i}`, color: colors.accent }, hint.key));
        parts.push(h(Text, { key: `label-${i}`, color: colors.textDim }, ` ${hint.label}`));
      });
      parts.push(h(Text, { key: 'div', color: colors.textMuted }, '  │  '));
    }

    // Add Esc hint
    parts.push(h(Text, { key: 'esc-key', color: colors.accent }, 'Esc'));
    parts.push(h(Text, { key: 'esc-label', color: colors.textDim },
      view === VIEWS.MENU ? ' exit' : ' back'
    ));

    return h(Box, null, ...parts);
  };

  return h(Box, { flexDirection: 'column', padding: 1 },
    // Header - Show Banner on main menu, simple header on other views
    view === VIEWS.MENU
      ? h(Banner, { version: VERSION })
      : h(Box, { marginBottom: 1 },
          h(Text, { bold: true, color: colors.primary }, `${icons.lock} evk`),
          h(Text, { color: colors.textDim }, ' - Environment Variable Keeper')
        ),

    // Views
    view === VIEWS.MENU && h(MainMenu, { onList: goToList, onAdd: goToAdd, onSync: goToSync, onImport: goToImport, onClean: goToClean, onExit: exit }),
    view === VIEWS.LIST && h(ListView, { onBack: goToMenu, onSelect: goToDetail, onAdd: goToAdd, showMessage, setFooterHints: updateFooterHints }),
    view === VIEWS.ADD && h(AddView, { onBack: goToList, onCancel: goToMenu, showMessage, setFooterHints: updateFooterHints }),
    view === VIEWS.SYNC && h(SyncView, { onBack: goToMenu, showMessage, setFooterHints: updateFooterHints }),
    view === VIEWS.CLEAN && h(CleanView, { onBack: goToMenu, showMessage, setFooterHints: updateFooterHints }),
    view === VIEWS.IMPORT && h(ImportView, { onBack: goToMenu, showMessage, setFooterHints: updateFooterHints }),
    view === VIEWS.DETAIL && h(DetailView, { varId: selectedId, onBack: goToList, showMessage, setFooterHints: updateFooterHints }),

    // Footer - shows message, hints, or navigation
    h(Box, {
      marginTop: 1,
      borderStyle: 'round',
      borderColor: message ? getMessageStyle(message.type).color : colors.border,
      paddingX: 2
    },
      h(FooterContent)
    )
  );
}
