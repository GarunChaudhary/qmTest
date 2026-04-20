import sql from "mssql";

const config = {
  user: process.env.MSSQLDB_USER,
  password: process.env.MSSQLDB_PASSWORD,
  server: process.env.MSSQLDB_SERVER,
  database: process.env.MSSQLDB_NAME,
  port: parseInt(process.env.MSSQLDB_PORT, 10), // Specify the port, default is 1433
  connectionTimeout: 180000, // Time in milliseconds before a timeout occurs during the initial
  requestTimeout: 180000, // Time in milliseconds before a timeout occurs during a query
  // pool: {
  //   max: 10, // Maximum number of connections in the pool
  //   min: 0, // Minimum number of connections in the pool
  //   idleTimeoutMillis: 30000, // Time in milliseconds before an idle connection is closed
  // },
  options: {
    encrypt: true, // for Azure SQL
    trustServerCertificate: true, // for local development
    enableArithAbort: true, // Prevents issues with certain SQL Server versions
    // isolationLevel: "READ_COMMITTED", // Sets the transaction isolation level
    appName: "QMApp", // The application name connecting to the database
    useUTC: true, // Use UTC time format
    multiSubnetFailover: true, // For multi-subnet clusters (always on)
  },
  debug: true, // Enable debug mode for more detailed error messages
};

export async function connectToDatabase() {
  try {
    // Make sure the pool has been created only once
    if (!global.connectionPool) {
      global.connectionPool = await sql.connect(config);
    }
    return global.connectionPool;
  } catch (err) {
    console.error("Database connection failed: ", err);
    throw err;
  }
}

export async function executeStoredProcedure(
  procedureName,
  inputParameters = {},
  outputParameters = {}
) {
  try {
    const pool = await connectToDatabase();
    const request = pool.request();

    // Add input parameters
    if (inputParameters && Object.keys(inputParameters).length > 0) {
      for (const paramName in inputParameters) {
        const value = inputParameters[paramName];

        // Let mssql infer the type to avoid type-instance mismatches.
        request.input(paramName, value);

        // request.input(paramName, inputParameters[paramName]);
      }
    }

    // Add output parameters
    // 1. Generic Approch
    if (outputParameters && Object.keys(outputParameters).length > 0) {
      outputParameters.forEach((param) => {
        request.output(param.name);
      });
    }

    // 2.
    /*
    outputParameters.forEach((param) => {
      if (param.length) {
        if (param.dtype === sql.NVarChar) {
          request.output(param.name, sql.NVarChar(param.length));
        } else if (param.dtype === sql.VarChar) {
          request.output(param.name, sql.VarChar(param.length));
        } else {
          request.output(param.name, param.dtype);
        }
      } else {
        request.output(param.name, param.dtype);
      }
    });
    */

    // 3.
    /*
    for (const param in outputParameters) {
      if (param.length) {
        request.output(param.name, param.type(param.length));
      } else {
        request.output(param.name, param.type);
      }
    }*/

    // Execute the stored procedure
    const result = await request.execute(procedureName);
    return result;
  } catch (err) {
    console.error(`Failed to execute stored procedure: ${procedureName}`, err);
    throw err;
  }
}

export async function TotalRecords(dataSet) {
  return dataSet[0].TotalCount;
}

export const outputmsgParams = [
  {
    name: "outputmsg",
    dtype: sql.NVarChar,
    length: 100,
  },
];

export const outputmsgWithStatusCodeParams = [
  {
    name: "outputmsg",
    dtype: sql.NVarChar,
    length: 100,
  },
  {
    name: "statuscode",
    dtype: sql.Int,
  },
];
