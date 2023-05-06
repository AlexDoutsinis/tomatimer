import izicli from 'izicli';
import ansiEscapes from 'ansi-escapes';
import ansiColors from 'ansi-colors';
import figures from 'figures';
import notifier from 'node-notifier';
import inquirer from 'enquirer';

const { circleDotted } = figures
const { bold, red, green, gray, cyan, yellow, magenta } = ansiColors
const { Select, Form } = inquirer

const projects = [
    {
        name: 'Project 1',
        description: 'This is Project 1',
        analytics: { intervals: 0, minutes: 0, lastUpdated: null },
        tasks: [
            { name: 'Task 1.1', analytics: { intervals: 0, minutes: 0, lastUpdated: null } },
            { name: 'Task 1.2', analytics: { intervals: 0, minutes: 0, lastUpdated: null } },
            { name: 'Task 1.3', analytics: { intervals: 0, minutes: 0, lastUpdated: null } },
        ],
    },
    {
        name: 'Project 2',
        description: 'This is Project 2',
        analytics: { intervals: 0, minutes: 0, lastUpdated: null },
        tasks: [
            { name: 'Task 2.1', analytics: { intervals: 0, minutes: 0, lastUpdated: null } },
            { name: 'Task 2.2', analytics: { intervals: 0, minutes: 0, lastUpdated: null } },
            { name: 'Task 2.3', analytics: { intervals: 0, minutes: 0, lastUpdated: null } },
        ],
    },
];

const individualTasks = [
    { name: 'Individual Task 1', analytics: { intervals: 0, minutes: 0, lastUpdated: null } },
    { name: 'Individual Task 2', analytics: { intervals: 0, minutes: 0, lastUpdated: null } },
    { name: 'Individual Task 3', analytics: { intervals: 0, minutes: 0, lastUpdated: null } },
];

function getTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

async function promptProjectAndTasks() {
    const action = await new Select({
        name: 'action',
        message: 'What would you like to do?',
        choices: [
            'Select an existing project',
            'Create a new project',
            'Select an individual task',
            'Create a new individual task',
        ],
    }).run();

    let projectName;
    let selectedTask;

    if (action === 'Select an existing project') {
        const projectChoices = projects.map((project) => project.name);
        projectName = await new Select({
            name: 'project',
            message: 'Choose a project:',
            choices: projectChoices,
        }).run();

        const selectedProject = projects.find((project) => project.name === projectName);
        const projectTask = await new Select({
            name: 'tasks',
            message: 'Select a task from the project:',
            choices: selectedProject.tasks,
        }).run();

        selectedTask = projectTask;
    } else if (action === 'Create a new project') {
        const projectForm = await new Form({
            name: 'project',
            message: 'Enter project details:',
            choices: [
                { name: 'name', message: 'Project name', initial: 'My Project' },
                { name: 'description', message: 'Project description', initial: 'A brief description of the project' },
            ],
        }).run();

        console.log(`Project: ${projectForm.name}\nDescription: ${projectForm.description}`);
    } else if (action === 'Select an individual task') {
        const task = await new Select({
            name: 'tasks',
            message: 'Select an individual task:',
            choices: individualTasks,
        }).run();

        selectedTask = task;
    } else if (action === 'Create a new individual task') {
        const newTask = await new Form({
            name: 'task',
            message: 'Enter task details:',
            choices: [{ name: 'name', message: 'Task name', initial: 'New Task' }],
        }).run();

        individualTasks.push(newTask.name);
        selectedTask = newTask.name;
    }

    return { projectName, selectedTask }
}

function sendNotification(title, message) {
    notifier.notify({
        title: title,
        message: message,
        sound: true,
    });
}

function drawProgressBar(progress, width) {
    const completed = Math.round(progress * width);
    const remaining = width - completed;
    const completedStr = bold(cyan(`${circleDotted}`)).repeat(completed);
    const remainingStr = gray(`${circleDotted}`).repeat(remaining);
    process.stdout.write(ansiEscapes.cursorLeft + completedStr + remainingStr);
}

async function pomodoro(workDuration = 25, breakDuration = 5, intervals = 0) {
    const { projectName, selectedTask } = await promptProjectAndTasks();

    const workMillis = workDuration * 60 * 1000;
    const breakMillis = breakDuration * 60 * 1000;
    let intervalCount = 0;

    const updateAnalytics = (elapsedMinutes) => {
        const currentTime = new Date();
        const timezone = getTimezone();

        if (projectName) {
            const project = projects.find((project) => project.name === projectName);
            const task = project.tasks.find((task) => task.name === selectedTask);

            task.analytics.intervals += 1;
            task.analytics.minutes += elapsedMinutes;
            task.analytics.lastUpdated = { date: currentTime, timezone: timezone };

            project.analytics.intervals += 1;
            project.analytics.minutes += elapsedMinutes;
            project.analytics.lastUpdated = { date: currentTime, timezone: timezone };
        } else {
            const task = individualTasks.find((task) => task.name === selectedTask);
            task.analytics.intervals += 1;
            task.analytics.minutes += elapsedMinutes;
            task.analytics.lastUpdated = { date: currentTime, timezone: timezone };
        }
    };

    while (true) {
        intervalCount += 1;
        const workMessage = projectName
            ? `Let's focus on the ${bold(cyan(projectName))} project, specifically the ${bold(yellow(selectedTask))} task for the next ${bold(magenta(workDuration))} minutes.`
            : `Time to concentrate on the ${bold(yellow(selectedTask))} task for ${bold(magenta(workDuration))} minutes.`;
        console.log(red(`\n${workMessage}`));
        await timer(workMillis, updateAnalytics);

        if (projectName) {
            const project = projects.find((project) => project.name === projectName);
            const task = project.tasks.find((task) => task.name === selectedTask);
            task.analytics.intervals += 1;
            task.analytics.minutes += workDuration;

            project.analytics.intervals += 1;
            project.analytics.minutes += workDuration;
        } else {
            const task = individualTasks.find((task) => task.name === selectedTask);
            task.analytics.intervals += 1;
            task.analytics.minutes += workDuration;
        }

        sendNotification('Pomodoro Timer', `Great job! You've earned a break. Relax and enjoy!`);

        if (intervals > 0 && intervalCount >= intervals) {
            console.log(green(`\nYou have completed the desired number of intervals!`));
            sendNotification('Pomodoro Timer', `Congratulations! You've successfully completed ${intervals} intervals. Keep up the good work!`);
            break;
        }

        console.log(green(`\nTake a ${breakDuration}-minute break to recharge.`));
        await timer(breakMillis);
        sendNotification('Pomodoro Timer', `Break time is over. Let's get back to work and make progress!`);
    }
}

function timer(duration, updateAnalytics = null) {
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

        process.on('SIGINT', () => {
            clearInterval(intervalId);

            if (updateAnalytics) {
                const elapsedMinutes = Math.floor(elapsed / (60 * 1000));
                updateAnalytics(elapsedMinutes);
            }

            process.exit();
        });
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
        {
            name: { full: 'intervals', short: 'i' },
            description: 'Number of intervals to complete',
            isRequired: false,
            valueIsRequired: true,
        },
    ])
    .action(({ work: workDuration, break: breakDuration, intervals }) => {
        pomodoro(workDuration, breakDuration, intervals);
    });

izicli.parse(process.argv);

// integrate Notion