#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
// const commander = require('commander');

const { Command } = require('commander');
const commander = new Command();

commander
  .version('1.0.0', '-v, --version')
  .usage('[OPTIONS]...')
  .requiredOption('-i, --inputDirectory <directory>', 'The directory of your icons')
  .option('-s, --stencilFile <file>', 'The file your components icons JSON should export to')
  .option('-t, --tokensFile <file>', 'The file your css custom property icons JSON should export to')
  .option('-r, --variant <string>', 'The tokens variant name for svgs.')
  .option('-c, --colors <array>', 'Optionally colorize svgs with currentColor as fill or stroke.')
  .parse(process.argv);

const options = commander.opts();
const inputDirectory = options.inputDirectory;
const resolvedDirectory = path.resolve(inputDirectory);
const stencilFile = options.stencilFile !== undefined ? path.resolve(options.stencilFile) : false;
const tokensFile = options.tokensFile !== undefined ? path.resolve(options.tokensFile) : false;
const variant = options.variant !== undefined ? options.variant : 'icon';

function readSvg(dir) {
  const tail = '.svg';
  return fs
    .readdirSync(dir)
    .filter(file => file.includes(tail))
    .reduce((acc, filePath) => {
      const name = filePath.replace(tail, '');
      try {
        acc[name] = fs.readFileSync(path.join(dir, filePath), 'utf8');
      } catch (err) {
        console.error(`file read error ${filePath}: ${err}`);
      }
      return acc;
    }, {});
}

function writeStencilJSON(dir, file) {
  try {
    const svgs = readSvg(dir);
    fs.writeFileSync(file, JSON.stringify(svgs));
  } catch (err) {
    console.error(err);
  }
}

function tokenizeSvg(dir) {
  const tail = '.svg';
  return fs
    .readdirSync(dir)
    .filter(file => file.includes(tail))
    .reduce((acc, filePath) => {
      const name = filePath.replace(tail, '');
      try {
        acc[name] = {
          value: `url("data:image/svg+xml;base64,${fs.readFileSync(path.join(dir, filePath), 'base64')}")`,
        };
      } catch (err) {
        console.error(`file read error ${filePath}: ${err}`);
      }
      return acc;
    }, {});
}

function writeTokensJSON(dir, file) {
  try {
    const data = { [variant]: tokenizeSvg(dir) };
    fs.writeFileSync(file, JSON.stringify(data));
  } catch (err) {
    console.error(err);
  }
}

if (stencilFile) {
  writeStencilJSON(resolvedDirectory, stencilFile);
}

if (tokensFile) {
  writeTokensJSON(resolvedDirectory, tokensFile);
}
