import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import path from 'path';
import os from 'os';
import { getAllVariables } from '../../core/store.js';
import { syncToFile } from '../../core/sync.js';
import { expandPath } from '../../utils/file.js';

const { createElement: h } = React;

const TARGETS = [
  { label: '~/.zshrc', value: 'zsh', path: path.join(os.homedir(), '.zshrc') },
  { label: '~/.bashrc', value: 'bash', path: path.join(os.homedir(), '.bashrc') },
  { label: '.env (current dir)', value: 'env', path: path.join(process.cwd(), '.env') },
  { label: 'Custom path...', value: 'custom', path: null }
];

export default function SyncView({ onBack, showMessage }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState('select'); // select, custom
  const [customPath, setCustomPath] = useState('');

  useInput((input, key) => {
    if (key.escape) {
      if (mode === 'custom') {
        setMode('select');
        setCustomPath('');
      } else {
        onBack();
      }
    }
  });

  const doSync = (targetPath) => {
    setSyncing(true);
    setResult(null);

    try {
      const vars = getAllVariables();
      if (Object.keys(vars).length === 0) {
        showMessage('No variables to sync', 'warning');
        setSyncing(false);
        return;
      }
      const syncResult = syncToFile(targetPath, vars);
      setResult(syncResult);
      showMessage(`Synced to ${syncResult.path}`);

      if (syncResult.commented && syncResult.commented.length > 0) {
        showMessage(`Commented out conflicts: ${syncResult.commented.join(', ')}`, 'warning');
      }
    } catch (err) {
      showMessage(err.message, 'error');
    }
    setSyncing(false);
    setMode('select');
  };

  const handleSelect = (item) => {
    if (item.value === 'custom') {
      setMode('custom');
      return;
    }

    const target = TARGETS.find(t => t.value === item.value);
    if (!target || !target.path) return;

    doSync(target.path);
  };

  const handleCustomSubmit = () => {
    if (!customPath.trim()) {
      showMessage('Please enter a path', 'error');
      return;
    }

    const targetPath = expandPath(customPath.trim());
    doSync(targetPath);
  };

  if (syncing) {
    return h(Box, null,
      h(Text, { color: 'cyan' }, h(Spinner, { type: 'dots' })),
      h(Text, null, ' Syncing...')
    );
  }

  // Custom path input mode
  if (mode === 'custom') {
    return h(Box, { flexDirection: 'column' },
      h(Box, { marginBottom: 1 }, h(Text, { bold: true }, 'Sync to Custom Path')),
      h(Box, { marginBottom: 1 },
        h(Text, { color: 'gray' }, 'Enter file path: '),
        h(TextInput, {
          value: customPath,
          onChange: setCustomPath,
          onSubmit: handleCustomSubmit,
          placeholder: '~/path/to/file or ./relative/path'
        })
      ),
      h(Box, { marginTop: 1 },
        h(Text, { color: 'gray' }, 'Enter to sync, Esc to go back')
      )
    );
  }

  // Select mode
  return h(Box, { flexDirection: 'column' },
    h(Box, { marginBottom: 1 }, h(Text, { bold: true }, 'Sync to Target')),
    h(Box, { marginBottom: 1 }, h(Text, { color: 'gray' }, 'Select target file:')),
    h(SelectInput, { items: TARGETS, onSelect: handleSelect }),

    result && h(Box, { flexDirection: 'column', marginTop: 1, borderStyle: 'single', borderColor: 'green', paddingX: 1 },
      h(Text, { color: 'green' }, 'Sync completed!'),
      h(Text, null, `  Path: ${result.path}`),
      h(Text, null, `  Added: ${result.added}, Updated: ${result.updated}, Deprecated: ${result.deprecated}`),
      result.commented && result.commented.length > 0 && h(Text, { color: 'yellow' }, `  Conflicts commented: ${result.commented.join(', ')}`)
    ),

    h(Box, { marginTop: 1 }, h(Text, { color: 'gray' }, 'Esc to go back'))
  );
}
