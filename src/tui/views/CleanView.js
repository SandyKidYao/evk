import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import path from 'path';
import os from 'os';
import { cleanFile } from '../../core/sync.js';
import { expandPath, fileExists } from '../../utils/file.js';
import { colors, icons } from '../theme.js';

const { createElement: h } = React;

const TARGETS = [
  { label: `${icons.bullet} ~/.zshrc`, value: 'zsh', path: path.join(os.homedir(), '.zshrc') },
  { label: `${icons.bullet} ~/.bashrc`, value: 'bash', path: path.join(os.homedir(), '.bashrc') },
  { label: `${icons.bullet} .env (current dir)`, value: 'env', path: path.join(process.cwd(), '.env') },
  { label: `${icons.edit} Custom path...`, value: 'custom', path: null },
  { label: `${icons.clean} Clean all preset files`, value: 'all', path: null }
];

export default function CleanView({ onBack, showMessage, setFooterHints }) {
  const [mode, setMode] = useState('select'); // select, custom, confirm
  const [customPath, setCustomPath] = useState('');
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [results, setResults] = useState([]);

  // Update footer hints - CleanView has no special shortcuts
  useEffect(() => {
    setFooterHints([]);
  }, [setFooterHints]);

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
      h(Box, { marginBottom: 1 },
        h(Text, { bold: true, color: colors.primary }, `${icons.clean} Clean Custom Path`)
      ),
      h(Box, {
        flexDirection: 'column',
        borderStyle: 'round',
        borderColor: colors.accent,
        paddingX: 2,
        paddingY: 1
      },
        h(Box, { marginBottom: 1 },
          h(Text, { color: colors.textDim }, 'Enter file path:')
        ),
        h(Box, {
          borderStyle: 'round',
          borderColor: colors.border,
          paddingX: 1
        },
          h(TextInput, {
            value: customPath,
            onChange: setCustomPath,
            onSubmit: handleCustomSubmit,
            placeholder: '~/path/to/file'
          })
        )
      )
    );
  }

  // Confirm mode
  if (mode === 'confirm' && selectedTarget) {
    return h(Box, { flexDirection: 'column' },
      h(Box, { marginBottom: 1 },
        h(Text, { color: colors.warning, bold: true },
          `${icons.warning} Remove evk block from ${selectedTarget.label}?`
        )
      ),
      h(Box, {
        flexDirection: 'column',
        borderStyle: 'round',
        borderColor: colors.warning,
        paddingX: 2,
        paddingY: 1
      },
        h(Text, { color: colors.textDim, marginBottom: 1 },
          'Previously commented variables will be restored.'
        ),
        h(SelectInput, {
          items: [
            { label: `${icons.back} No, cancel`, value: 'no' },
            { label: `${icons.clean} Yes, clean`, value: 'yes' }
          ],
          onSelect: handleConfirm
        })
      )
    );
  }

  // Select mode
  return h(Box, { flexDirection: 'column' },
    h(Box, { marginBottom: 1 },
      h(Text, { bold: true, color: colors.primary }, `${icons.clean} Clean evk Blocks`)
    ),
    h(Box, {
      flexDirection: 'column',
      borderStyle: 'round',
      borderColor: colors.border,
      paddingX: 2,
      paddingY: 1
    },
      h(Box, { marginBottom: 1 },
        h(Text, { color: colors.textDim }, 'Select file to remove managed block from:')
      ),
      h(SelectInput, { items: TARGETS, onSelect: handleSelect })
    ),

    results.length > 0 && h(Box, {
      flexDirection: 'column',
      marginTop: 1,
      borderStyle: 'round',
      borderColor: colors.border,
      paddingX: 2,
      paddingY: 1
    },
      h(Text, { bold: true, color: colors.primary }, 'Results:'),
      h(Box, { flexDirection: 'column', marginTop: 1 },
        ...results.map((r, i) =>
          h(Box, { key: i, flexDirection: 'column', marginBottom: i < results.length - 1 ? 1 : 0 },
            h(Box, null,
              h(Text, { color: r.status === 'cleaned' ? colors.success : colors.textMuted },
                r.status === 'cleaned' ? `${icons.success} ` : '  '
              ),
              h(Text, { color: colors.textDim }, r.path),
              h(Text, { color: r.status === 'cleaned' ? colors.success : colors.warning },
                r.status === 'cleaned' ? ' (cleaned)' :
                r.status === 'no_block' ? ' (no block)' : ' (not found)'
              )
            ),
            r.restored.length > 0 && h(Box, { marginLeft: 2 },
              h(Text, { color: colors.accent }, `${icons.back} Restored: ${r.restored.join(', ')}`)
            )
          )
        )
      )
    )
  );
}
