#!/usr/bin/env node
const semver = require('semver');
const path = require('path');

// some platforms create a copy of the binary file instead of a symlink
const frameworkFolder = path.join(__dirname, '../nightframe')
  .replace('node_modules/nightframe/nightframe', 'node_modules/nightframe');

const requiredVersion = require(path.join(frameworkFolder, 'package.json')).engines.node;
const chalk = require('chalk');
const Utils = require(path.join(frameworkFolder, 'util/utils.js'));
const Nightframe = require(path.join(frameworkFolder, 'lib/server.js'));
const CliSetup = require(path.join(frameworkFolder, 'lib/cli-setup.js'));

function requireApp() {
  const Application = require(path.join(frameworkFolder, 'lib/app.js'));

  let userDefined = path.join(process.cwd(), 'app.js');
  if (Utils.fileExistsSync(userDefined)) {
    const UserDefinedApp = require(userDefined);
    if (!(UserDefinedApp.prototype instanceof Application)) {
      throw new Error('app.js must export a class which extends the <Application> base class.');
    }

    return UserDefinedApp;
  }

  return Application;
}

function checkNodeVersion (wanted, id) {
  if (!semver.satisfies(process.version, wanted)) {
    console.error('You are using Node ' + process.version + ', but this version of ' + id +
      ' requires Node ' + wanted + '.\nPlease upgrade your Node version.'
    );
    process.exit(1);
  }
}

const start = async () => {
  const {argv} = CliSetup;

  if (argv.help) {
    CliSetup.showHelp();
  } else if (argv.info) {
    console.log('  Environment Info:');

    require('envinfo').run(
      {
        System: ['OS', 'CPU'],
        Binaries: ['Node', 'Yarn', 'npm'],
        Browsers: ['Chrome', 'Edge', 'Firefox', 'Safari']
      },
      {
        showNotFound: true,
        duplicates: true,
        fullTree: true
      }
    ).then(console.log);
  } else if (argv.version) {
    let packageConfig = require(path.join(frameworkFolder, 'package.json'));
    console.log('  Nightframe:');
    console.log('    version: ' + packageConfig.version);
    //console.log('    changelog: https://github.com/nightwatchjs/nightwatch/releases/tag/v' + packageConfig.version + '\n');
  } else {
    const Application = requireApp();
    const appInstance = new Application();
    await appInstance.init(argv);

    const server = new Nightframe(appInstance.app, appInstance.settings);

    await server.start();
  }

};

checkNodeVersion(requiredVersion, 'nightframe');
start().catch((err) => {
  console.error(chalk.bold.red('   An error occurred while trying to start the application:\n'));
  Utils.showStackTrace(err.stack);
  console.error('');

  process.exit(1);
});
