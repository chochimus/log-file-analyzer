import { readFile } from 'node:fs/promises';


async function main() {
  const [fileName] = process.argv.slice(2);

  if (fileName === undefined ) {
    console.error('No file name given.');
    return;
  }
  try {
    let data = await readFile(`./${fileName}`, 'utf8');
    
    if (!data) {
      throw new Error('No data in file.');
    }

    const records = parseData(data);
    const badRecords = data.split('\n').length - records.length;
    generateReport(records, badRecords);
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`File not found: ${fileName}`);
      return;
    }
    console.error(`Error: ${error.message}`);
    return
  }
}

function parseData(data) {
  let cleanedData = data.split('\n').filter(record => {
    return validRecord(record);
  });

  return cleanedData.map(record => {
    let [dateString, status, method, path, time] = record.split(' ');
    return {
      date: new Date(dateString),
      status: Number(status),
      method,
      path,
      time: Number(time)
    }
  }); 
}

function validRecord(recordString) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z \d{3} (GET|POST|PATCH|PUT|DELETE) \/api(\/([a-zA-Z]|\d)+)* \d+$/.test(recordString);
}

function generateReport(records, badRecords) {
  console.log(`Total requests: ${records.length}`);
  console.log(`Malformed lines: ${badRecords}\n`)
  console.log('Requests by status code: ');
  console.log(`${requestsByStatusCode(records)}\n`);
  console.log('Requests by method: ');
  console.log(`${requestsByMethod(records)}\n`);
  console.log(`Most requested path: `);
  console.log(`${mostRequestedPath(records)}\n`)
  console.log(`Average Response time: ${averageResponseTime(records)}`);
  console.log(`Slowest requests: ${slowestRequest(records)}`);
  console.log(`Error rate: ${errorRate(records).toFixed(2)}%`);
}

function errorRate(records) {
  const errorStatuses = [400, 401, 404, 409, 422, 500];
  let numErrors = records.reduce((errors, record) => {
    if (errorStatuses.includes(record.status)) {
      errors += 1;
    } 
    return errors;
  }, 0);
  return (numErrors / records.length) * 100;
}

function slowestRequest(records) {
  let result = records.reduce((slowest, record) => {
    if (record.time > slowest.time) {
      slowest = record;
    }
    return slowest;
  }, {time: 0});
  return `${result.status} ${result.method} ${result.path}: ${result.time}`;
}

function averageResponseTime(records) {
  let result = records.reduce((total, record) => {
    return total + record.time;
  }, 0);
  return (result / records.length);
}

function mostRequestedPath(records) {
  let result = records.reduce((accum, record) => {
    accum[record.path] = (accum[record.path] || 0) + 1;
    return accum;
  }, {});
  let max = ['', 0];
  for (let [path, value] of Object.entries(result)) {
    if (value > max[1]) {
      max = [path, value];
    }
  }
  return `PATH ${max[0]}: ${max[1]}`;
}

function requestsByMethod(records) {
  let result = records.reduce((accum, record) => {
    accum[record.method] = (accum[record.method] || 0) + 1;
    return accum;
  }, {});
  return Object.keys(result)
    .map(method => {
      return `METHOD ${method}: ${result[method]} records`;
    }).join('\n');
}

function requestsByStatusCode(records) {
  let result = records.reduce((accum, record) => {
    accum[record.status] = (accum[record.status] || 0) + 1;
    return accum;
  }, {});
  return Object.keys(result)
    .map(code => {
      return `STATUS ${code}: ${result[code]} records`;
    }).join('\n');
}

main();