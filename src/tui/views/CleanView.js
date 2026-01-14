import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import path from 'path';
import os from 'os';
import { cleanFile } from '../../core/sync.js';
import { expandPath, fileExists } from '../../utils/file.js';

const { createElement: h } = React;

const TARGETS = [
  { label: '~/.zshrc', value: 'zsh', path: path.join(os.homedir(), '.zshrc') },
  { label: '~/.bashrc', value: 'bash', path: path.join(os.homedir(), '.bashrc') },
  { label: '.env (current dir)', value: 'env', path: path.join(process.cwd(), '.env') },
  { label: 'Custom path...', value: 'custom', path: null },
  { label: 'Clean all preset files', value: 'all', path: null }
];

export default function CleanView({ onBack, showMessage }) {
  const [mode, setMode] = useState('select'); // select, custom, confirm
  const [customPath, setCustomPath] = useState('');
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [results, setResults] = useState([]);

  useInput((input, key) => {
    if (key.escape) {
      if (mode === 'custom' || mode === 'confirm') {
        setMode('select');
        setCustomPath('');
        setSelectedTarget(null);
      } else {
        onBack();
      }
    }
  });

  const doClean = (targetPath) => {
    if (!fileExists(targetPath)) {
      return { path: targetPath, status: 'not_found', restored: [] };
    }

    const result = cleanFile(targetPath);

    if (result.cleaned || result.restored.length > 0) {
      return { path: targetPath, status: 'cleaned', restored: result.restored };
    } else {
      return { path: targetPath, status: 'no_block', restored: [] };
    }
  };

  const handleSelect = (item) => {
    if (item.value === 'custom') {
      setMode('custom');
      return;
    }

    if (item.value === 'all') {
      // Clean all preset files
      const presetPaths = TARGETS
        .filter(t => t.path !== null)
        .map(t => t.path);

      const cleanResults = presetPaths.map(p => doClean(p));
      setResults(cleanResults);

      const cleaned = cleanResults.filter(r => r.status === 'cleaned').length;
      const totalRestored = cleanResults.reduce((acc, r) => acc + r.restored.length, 0);

      if (cleaned > 0) {
        let msg = `Cleaned ${cleaned} file(s)`;
        if (totalRestored > 0) {
          msg += `, restored ${totalRestored} variable(s)`;
        }
        showMessage(msg);
      } else {
        showMessage('No managed blocks found', 'warning');
      }
      return;
    }

    const target = TARGETS.find(t => t.value === item.value);
    if (!target || !target.path) return;

    setSelectedTarget(target);
    setMode('confirm');
  };

  const handleConfirm = (item) => {
    if (item.value === 'yes') {
      const result = doClean(selectedTarget.path);
      if (result.status === 'cleaned') {
        let msg = `Cleaned ${selectedTarget.path}`;
        if (result.restored.length > 0) {
          msg += `, restored: ${result.restored.join(', ')}`;
        }
        showMessage(msg);
      } else if (result.status === 'no_block') {
        showMessage('No managed block found', 'warning');
      } else {
        showMessage('File not found', 'error');
      }
    }
    setMode('select');
    setSelectedTarget(null);
  };

  const handleCustomSubmit = () => {
    if (!customPath.trim()) {
      showMessage('Please enter a path', 'error');
      return;
    }

    const targetPath = expandPath(customPath.trim());
    const result = doClean(targetPath);

    if (result.status === 'cleaned') {
      let msg = `Cleaned ${targetPath}`;
      if (result.restored.length > 0) {
        msg += `, restored: ${result.restored.join(', ')}`;
      }
      showMessage(msg);
    } else if (result.status === 'no_block') {
      showMessage('No managed block found in file', 'warning');
    } else {
      showMessage('File not found', 'error');
    }

    setMode('select');
    setCustomPath('');
  };

  // Custom path input mode
  if (mode === 'custom') {
    return h(Box, { flexDirection: 'column' },
      h(Box, { marginBottom: 1 }, h(Text, { bold: true }, 'Clean Custom Path')),
      h(Box, { marginBottom: 1 },
        h(Text, { color: 'gray' }, 'Enter file path: '),
        h(TextInput, {
          value: customPath,
          onChange: setCustomPath,
          onSubmit: handleCustomSubmit,
          placeholder: '~/path/to/file'
        })
      ),
      h(Box, { marginTop: 1 },
        h(Text, { color: 'gray' }, 'Enter to clean, Esc to go back')
      )
    );
  }

  // Confirm mode
  if (mode === 'confirm' && selectedTarget) {
    return h(Box, { flexDirection: 'column' },
      h(Text, { color: 'yellow', bold: true }, `Remove evk block from ${selectedTarget.label}?`),
      h(Box, { marginTop: 1 },
        h(SelectInput, {
          items: [
            { label: 'No, cancel', value: 'no' },
            { label: 'Yes, clean', value: 'yes' }
          ],
          onSelect: handleConfirm
        })
      )
    );
  }

  // Select mode
  return h(Box, { flexDirection: 'column' },
    h(Box, { marginBottom: 1 }, h(Text, { bold: true }, 'Clean evk Blocks')),
    h(Box, { marginBottom: 1 }, h(Text, { color: 'gray' }, 'Select file to remove managed block from:')),
    h(SelectInput, { items: TARGETS, onSelect: handleSelect }),

    results.length > 0 && h(Box, { flexDirection: 'column', marginTop: 1, borderStyle: 'single', borderColor: 'gray', paddingX: 1 },
      h(Text, { bold: true }, 'Results:'),
      ...results.map((r, i) =>
        h(Box, { key: i, flexDirection: 'column' },
          h(Box, null,
            h(Text, { color: r.status === 'cleaned' ? 'green' : 'gray' },
              r.status === 'cleaned' ? '✓ ' : '  '
            ),
            h(Text, { color: 'gray' }, r.path),
            h(Text, { color: r.status === 'cleaned' ? 'green' : 'yellow' },
              r.status === 'cleaned' ? ' (cleaned)' :
              r.status === 'no_block' ? ' (no block)' : ' (not found)'
            )
          ),
          r.restored.length > 0 && h(Box, null,
            h(Text, { color: 'cyan' }, `    Restored: ${r.restored.join(', ')}`)
          )
        )
      )
    ),

    h(Box, { marginTop: 1 }, h(Text, { color: 'gray' }, 'Esc to go back'))
  );
}
