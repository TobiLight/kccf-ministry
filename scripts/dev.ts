const watchers = [
  { label: "css", command: ["bunx", "@tailwindcss/cli", "-i", "src/input.css", "-o", "public/static/style.css", "--watch=always"] },
  { label: "server", command: ["bun", "run", "--watch", "src/index.ts"] },
] as const;

type Child = { label: string; process: Bun.Subprocess };

const children: Child[] = [];
let shuttingDown = false;

function stopAll(signal: NodeJS.Signals | "exit", code: number) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.process.killed) child.process.kill(signal === "exit" ? undefined : signal);
  }

  process.exitCode = code;
}

for (const watcher of watchers) {
  const child = Bun.spawn(watcher.command, {
    cwd: process.cwd(),
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    onExit(_subprocess, exitCode, signalCode) {
      if (shuttingDown) return;
      const reason = signalCode ? `signal ${signalCode}` : `code ${exitCode}`;
      console.error(`dev: ${watcher.label} exited (${reason}); stopping the other process`);
      stopAll("exit", exitCode ?? 1);
    },
  });

  children.push({ label: watcher.label, process: child });
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.on(signal, () => stopAll(signal, 0));
}

console.log(`dev: supervising ${watchers.map((watcher) => watcher.label).join(" and ")}`);
