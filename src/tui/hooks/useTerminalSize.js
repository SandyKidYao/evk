import { useState, useEffect } from 'react';
import { useStdout } from 'ink';

// Tracks terminal size and triggers re-render on window resize
export default function useTerminalSize() {
  const { stdout } = useStdout();
  const [size, setSize] = useState({
    columns: stdout?.columns || 80,
    rows: stdout?.rows || 24
  });

  useEffect(() => {
    if (!stdout) return;
    const onResize = () => {
      setSize({
        columns: stdout.columns || 80,
        rows: stdout.rows || 24
      });
    };
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout]);

  return size;
}
