import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { getAllVariables, getAllTags } from '../../core/store.js';

const { createElement: h } = React;

export default function ListView({ onBack, onSelect, onAdd, showMessage }) {
  const [vars, setVars] = useState({});
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [showTagFilter, setShowTagFilter] = useState(false);

  const loadData = (filterTag = null) => {
    try {
      const options = filterTag ? { tags: [filterTag] } : {};
      const data = getAllVariables(options);
      setVars(data);
      const tags = getAllTags();
      setAllTags(tags);
    } catch (err) {
      showMessage(err.message, 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData(selectedTag);
  }, [selectedTag]);

  useInput((input, key) => {
    if (showTagFilter) {
      if (key.escape) {
        setShowTagFilter(false);
      }
      return;
    }
    if (key.escape) onBack();
    if (input === 'a') onAdd();
    if (input === 't' && allTags.length > 0) {
      setShowTagFilter(true);
    }
    if (input === 'c' && selectedTag) {
      setSelectedTag(null);
    }
  });

  if (loading) return h(Text, null, 'Loading...');

  // Tag filter view
  if (showTagFilter) {
    const tagItems = [
      { label: '(All - Clear Filter)', value: null },
      ...allTags.map(tag => ({ label: tag, value: tag }))
    ];

    return h(Box, { flexDirection: 'column' },
      h(Box, { marginBottom: 1 },
        h(Text, { bold: true }, 'Select Tag to Filter'),
        h(Text, { color: 'gray' }, '  •  Press '),
        h(Text, { color: 'cyan' }, 'Esc'),
        h(Text, { color: 'gray' }, ' to cancel')
      ),
      h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor: 'blue', paddingX: 1 },
        h(SelectInput, {
          items: tagItems,
          onSelect: (item) => {
            setSelectedTag(item.value);
            setShowTagFilter(false);
          }
        })
      )
    );
  }

  const entries = Object.entries(vars);

  if (entries.length === 0) {
    return h(Box, { flexDirection: 'column' },
      selectedTag && h(Box, { marginBottom: 1 },
        h(Text, { color: 'blue' }, `Tag: ${selectedTag}`),
        h(Text, { color: 'gray' }, '  •  Press '),
        h(Text, { color: 'cyan' }, 'c'),
        h(Text, { color: 'gray' }, ' to clear filter')
      ),
      h(Text, { color: 'yellow' }, selectedTag ? 'No variables with this tag.' : 'No variables found.'),
      h(Box, { marginTop: 1 },
        h(Text, { color: 'gray' }, 'Press '),
        h(Text, { color: 'cyan' }, 'a'),
        h(Text, { color: 'gray' }, ' to add, '),
        h(Text, { color: 'cyan' }, 'Esc'),
        h(Text, { color: 'gray' }, ' to go back')
      )
    );
  }

  const items = entries.map(([key, data]) => {
    const sortedTags = (data.tags || []).slice().sort().join(', ');
    const valueDisplay = data.value.slice(0, 20) + (data.value.length > 20 ? '...' : '');
    return {
      label: `${key.padEnd(20)} ${valueDisplay.padEnd(24)} ${sortedTags}`,
      value: key
    };
  });

  return h(Box, { flexDirection: 'column' },
    h(Box, { marginBottom: 1 },
      h(Text, { bold: true }, `Variables (${entries.length})`),
      selectedTag && h(Text, { color: 'blue' }, ` [${selectedTag}]`),
      h(Text, { color: 'gray' }, '  •  '),
      h(Text, { color: 'cyan' }, 'a'),
      h(Text, { color: 'gray' }, ' add'),
      allTags.length > 0 && h(Text, { color: 'gray' }, '  '),
      allTags.length > 0 && h(Text, { color: 'cyan' }, 't'),
      allTags.length > 0 && h(Text, { color: 'gray' }, ' tag'),
      selectedTag && h(Text, { color: 'gray' }, '  '),
      selectedTag && h(Text, { color: 'cyan' }, 'c'),
      selectedTag && h(Text, { color: 'gray' }, ' clear')
    ),
    h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor: 'gray', paddingX: 1 },
      h(Box, { marginBottom: 1 },
        h(Text, { bold: true, color: 'gray' }, 'KEY'.padEnd(20) + ' ' + 'VALUE'.padEnd(24) + ' TAGS')
      ),
      h(SelectInput, { items, onSelect: (item) => onSelect(item.value) })
    )
  );
}
