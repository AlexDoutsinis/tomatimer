import izicli from 'izicli';
import ansiEscapes from 'ansi-escapes';
import ansiColors from 'ansi-colors';
import figures from 'figures';
import notifier from 'node-notifier';
import inquirer from 'enquirer';
import Table from 'cli-table3';
import fs from 'fs';
import path from 'path';

const { circleDotted } = figures
const { bold, red, green, gray, cyan, yellow } = ansiColors
const { Select, Form, Input } = inquirer

const dataFile = path.join(process.cwd(), 'pomodoro-cli.data.json');

async function readDataFromFile() {
    return new Promise((resolve, reject) => {
        fs.readFile(dataFile, 'utf8', (error, data) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    const defaultData = {
                        projects: [],
                        individualTasks: [],
                    };
                    fs.writeFile(dataFile, JSON.stringify(defaultData), 'utf8', (writeError) => {
                        if (writeError) {
                            reject(`Error creating data file: ${writeError.message}`);
                        } else {
                            resolve(defaultData);
                        }
                    });
                } else {
                    reject(`Error reading data from file: ${error.message}`);
                }
            } else {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (parseError) {
                    reject(`Error parsing JSON data: ${parseError.message}`);
                }
            }
        });
    });
}

function writeDataToFile(data) {
    try {
        const jsonData = JSON.stringify(data, null, 2);
        fs.writeFileSync(dataFile, jsonData, 'utf8');
    } catch (err) {
        console.error('Error writing data to file:', err);
    }
}

const { projects, individualTasks } = await readDataFromFile();

function displayProject(projectName) {
    const project = projects.find((p) => p.name === projectName);

    console.log(`\nProject: ${project.name}`);
    console.log(`Description: ${project.description}`);
    console.log(`Total Intervals: ${project.intervals}`);
    console.log(`Total Minutes: ${project.minutes}`);
    console.log(`Last Updated: ${project.lastUpdated
        ? `${project.lastUpdated.timestamp.toLocaleString()} (${project.lastUpdated.timezone})`
        : 'N/A'
        }\n`);

    console.log(`Tasks:`);
    project.tasks.forEach((task, index) => {
        const table = new Table({
            head: ['Task', 'Intervals', 'Minutes', 'Last Updated'],
            colWidths: [30, 15, 15, 30],
            style: { head: ['cyan'] },
        });

        table.push([
            task.name,
            task.intervals,
            task.minutes,
            task.lastUpdated
                ? `${task.lastUpdated.timestamp.toLocaleString()} (${task.lastUpdated.timezone})`
                : 'N/A',
        ]);

        console.log(table.toString());

        if (task.log.length > 0) {
            console.log(`    Logs:`);
            task.log.forEach((log, logIndex) => {
                console.log(`      ${logIndex + 1}. ${log.note} (${log.timestamp.toLocaleString()} ${log.timezone})`);
            });
        } else {
            console.log(`    Logs: N/A`);
        }

        console.log();
    });
}

function displayIndividualTask(taskName) {
    const task = individualTasks.find((t) => t.name === taskName);

    console.log();

    const table = new Table({
        head: ['Task Name', 'Intervals', 'Minutes', 'Last Updated'],
        colWidths: [30, 15, 15, 30],
        style: { head: ['cyan'] },
    });

    const lastUpdated = task.lastUpdated
        ? `${task.lastUpdated.timestamp.toLocaleString()} (${task.lastUpdated.timezone})`
        : 'N/A';

    table.push([
        task.name,
        task.intervals,
        task.minutes,
        lastUpdated,
    ]);

    console.log(table.toString());

    if (task.log.length > 0) {
        console.log(`Logs:`);
        task.log.forEach((log, index) => {
            console.log(`  ${index + 1}. ${log.note} (${log.timestamp.toLocaleString()} ${log.timezone})`);
        });
    } else {
        console.log(`Logs: N/A`);
    }

    console.log();
}

async function promptNote() {
    const response = await new Input({
        name: 'note',
        message: 'Describe what you accomplished during this interval (press Enter to skip):',
    }).run();

    return response;
}

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
            'Display a project and its tasks',
            'Display an individual task',
        ],
    }).run();

    let projectName;
    let selectedTask;

    if (action === 'Display a project and its tasks') {
        const projectToDisplay = await new Select({
            name: 'project',
            message: 'Choose a project to display:',
            choices: projects.map((project) => project.name),
        }).run();

        displayProject(projectToDisplay);
        return promptProjectAndTasks();
    }
    else if (action === 'Display an individual task') {
        const taskToDisplay = await new Select({
            name: 'tasks',
            message: 'Select an individual task to display:',
            choices: individualTasks.map((task) => task.name),
        }).run();

        displayIndividualTask(taskToDisplay);
        return promptProjectAndTasks();
    }
    else if (action === 'Select an existing project') {
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

        const newProject = {
            name: projectForm.name,
            description: projectForm.description,
            intervals: 0,
            minutes: 0,
            lastUpdated: null,
            tasks: [],
        };
        
        projects.push(newProject);

        writeDataToFile({ projects, individualTasks });

        console.log(`\nProject: ${projectForm.name}\nDescription: ${projectForm.description}`);

        const newTask = await new Form({
            name: 'task',
            message: 'Enter task details:',
            choices: [{ name: 'name', message: 'Task name', initial: 'New Task' }],
        }).run();

        newProject.tasks.push({
            name: newTask.name,
            intervals: 0,
            minutes: 0,
            lastUpdated: null,
            log: [],
        });
        writeDataToFile({ projects, individualTasks });

        projectName = newProject.name;
        selectedTask = newTask.name;
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
        writeDataToFile({ projects, individualTasks });
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

    const updateAnalytics = (elapsedMinutes, projectName, selectedTask) => {
        const timestamp = new Date();
        const timezone = getTimezone();

        if (projectName) {
            const project = projects.find((project) => project.name === projectName);
            const task = project.tasks.find((task) => task.name === selectedTask);

            task.intervals += 1;
            task.minutes += elapsedMinutes;
            task.lastUpdated = { timestamp, timezone: timezone };

            project.intervals += 1;
            project.minutes += elapsedMinutes;
            project.lastUpdated = { timestamp, timezone: timezone };
        } else {
            const task = individualTasks.find((task) => task.name === selectedTask);
            task.intervals += 1;
            task.minutes += elapsedMinutes;
            task.lastUpdated = { timestamp, timezone: timezone };
        }

        writeDataToFile({ projects, individualTasks });
    };

    while (true) {
        intervalCount += 1;

        process.stdout.write(ansiEscapes.clearScreen + ansiEscapes.cursorTo(0, 0));

        const workMessage = projectName
            ? `Let's focus on the ${bold(cyan(projectName))} project, specifically the ${bold(yellow(selectedTask))} task for the next ${workDuration} minutes.`
            : `Time to concentrate on the ${bold(yellow(selectedTask))} task for ${workDuration} minutes.`;
        console.log(red(`\nInterval ${intervalCount}: ${workMessage}`));
        await timer(workMillis, updateAnalytics, projectName, selectedTask, true);

        if (projectName) {
            const project = projects.find((project) => project.name === projectName);
            const task = project.tasks.find((task) => task.name === selectedTask);
            task.intervals += 1;
            task.minutes += workDuration;

            project.intervals += 1;
            project.minutes += workDuration;
        } else {
            const task = individualTasks.find((task) => task.name === selectedTask);
            task.intervals += 1;
            task.minutes += workDuration;
        }

        sendNotification('Pomodoro Timer', `Great job! You've earned a break. Relax and enjoy!`);

        if (intervals > 0 && intervalCount >= intervals) {
            console.log(green(`\nYou have completed the desired number of intervals!`));
            sendNotification('Pomodoro Timer', `Congratulations! You've successfully completed ${intervals} intervals. Keep up the good work!`);
            break;
        }

        console.log(green(`\nTake a ${breakDuration}-minute break to recharge.`));
        await timer(breakMillis, null, projectName, selectedTask, false);
        sendNotification('Pomodoro Timer', `Break time is over. Let's get back to work and make progress!`);
    }
}

function timer(duration, updateAnalytics = null, projectName, selectedTask, isWork) {
    return new Promise(async (resolve, reject) => {
        let elapsed = 0;
        const interval = 100;

        const intervalId = setInterval(async () => {
            elapsed += interval;
            const progress = elapsed / duration;
            drawProgressBar(progress, 50);

            if (elapsed >= duration) {
                clearInterval(intervalId);

                process.stdout.write(ansiEscapes.eraseLine + ansiEscapes.cursorLeft);

                if (isWork) {
                    const note = await promptNote();
                    if (note.trim() !== '') {
                        const timestamp = new Date();
                        const timezone = getTimezone();

                        if (projectName) {
                            const project = projects.find((project) => project.name === projectName);
                            const task = project.tasks.find((task) => task.name === selectedTask);
                            task.log.push({ note, timestamp, timezone });
                        } else {
                            const task = individualTasks.find((task) => task.name === selectedTask);
                            task.log.push({ note, timestamp, timezone });
                        }
                    }
                }

                resolve();
            }
        }, interval);

        process.on('SIGINT', () => {
            clearInterval(intervalId);

            if (updateAnalytics) {
                const elapsedMinutes = Math.floor(elapsed / (60 * 1000));
                updateAnalytics(elapsedMinutes);
            }

            reject('SIGINT');
        });
    })
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
    .action(async ({ work: workDuration, break: breakDuration, intervals }) => {
        try {
            await pomodoro(workDuration, breakDuration, intervals);
        } catch (error) {
            if (error === 'SIGINT') {
                process.exit();
            } else {
                process.exit();
            }
        }
    });

izicli.parse(process.argv);