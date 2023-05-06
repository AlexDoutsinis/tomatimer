import izicli from 'izicli';
import ansiEscapes from 'ansi-escapes';
import ansiColors from 'ansi-colors';
import figures from 'figures';

const {circleDotted} = figures
const {bold, red, green, gray} = ansiColors

function drawProgressBar(progress, width) {
  const completed = Math.round(progress * width);
  const remaining = width - completed;
  const completedStr = bold(green(`${circleDotted}`)).repeat(completed); // Apply the bold modifier to the green color
  const remainingStr = gray(`${circleDotted}`).repeat(remaining);
  process.stdout.write(ansiEscapes.cursorLeft + completedStr + remainingStr);
}

async function pomodoro(workDuration = 25, breakDuration = 5) {
  const workMillis = workDuration * 60 * 1000;
  const breakMillis = breakDuration * 60 * 1000;

  while (true) {
    console.log(red(`\nWork for ${workDuration} minutes.`));
    await timer(workMillis);
    console.log(green(`\nBreak for ${breakDuration} minutes.`));
    await timer(breakMillis);
  }
}

function timer(duration) {
  return new Promise(resolve => {
    let elapsed = 0;
    const interval = 100;

    const intervalId = setInterval(() => {
      elapsed += interval;
      const progress = elapsed / duration;
      drawProgressBar(progress, 50);

      if (elapsed >= duration) {
        clearInterval(intervalId);
        resolve();
      }
    }, interval);
  });
}

izicli.version('1.0.0');
izicli.command({
  name: 'pomodoro',
  description: 'Start a Pomodoro timer with work and break durations.',
})
  .options([
    {
      name: { full: 'work', short: 'w' },
      description: 'Work duration in minutes',
      isRequired: false,
      valueIsRequired: true,
    },
    {
      name: { full: 'break', short: 'b' },
      description: 'Break duration in minutes',
      isRequired: false,
      valueIsRequired: true,
    },
  ])
  .action(({ work: workDuration, break: breakDuration }) => {
    pomodoro(workDuration, breakDuration);
  });

izicli.parse(process.argv);