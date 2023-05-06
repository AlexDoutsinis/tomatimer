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
        tasks: ['Task 1.1', 'Task 1.2', 'Task 1.3'],
    },
    {
        name: 'Project 2',
        description: 'This is Project 2',
        tasks: ['Task 2.1', 'Task 2.2', 'Task 2.3'],
    },
];

const individualTasks = ['Individual Task 1', 'Individual Task 2', 'Individual Task 3'];

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

    return {projectName, selectedTask}
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
    const completedStr = bold(green(`${circleDotted}`)).repeat(completed);
    const remainingStr = gray(`${circleDotted}`).repeat(remaining);
    process.stdout.write(ansiEscapes.cursorLeft + completedStr + remainingStr);
}

async function pomodoro(workDuration = 25, breakDuration = 5) {
    const { projectName, selectedTask } = await promptProjectAndTasks();

    const workMillis = workDuration * 60 * 1000;
    const breakMillis = breakDuration * 60 * 1000;

    while (true) {
        const workMessage = projectName
            ? `Let's focus on the ${bold(cyan(projectName))} project, specifically the ${bold(yellow(selectedTask))} task for the next ${bold(magenta(workDuration))} minutes.`
            : `Time to concentrate on the ${bold(yellow(selectedTask))} task for ${bold(magenta(workDuration))} minutes.`;
        console.log(red(`\n${workMessage}`));
        await timer(workMillis);
        sendNotification('Pomodoro Timer', `Great job! You've earned a break. Relax and enjoy!`);
        console.log(green(`\nTake a ${breakDuration}-minute break to recharge.`));
        await timer(breakMillis);
        sendNotification('Pomodoro Timer', `Break time is over. Let's get back to work and make progress!`);
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

// allow users to provide the number of intervals
// add key bindings for pausing or ending the session
// store analytics
// integrate Notion