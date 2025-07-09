function generateSQLInsertStatements(numRecords) {
    const alarmTypes = ['fire_spark', 'fire_smoke', 'fire_flame'];
    const resolvedValues = [0, 1];
    const baseImagePath = '/images/alarm_';
    const baseCreatedAt = new Date('2023-10-01T08:00:00.000Z');
    const baseUpdatedAt = new Date('2025-01-01T00:00:00.000Z');

    let sql = 'INSERT INTO your_table_name (id, resolved, picFilePath, createdAt, updatedAt, deletedAt, sourceCameraId, alarmRuleId, alarmType, confidence)\nVALUES\n';

    for (let i = 1; i < numRecords; i++) {
        const resolved = resolvedValues[Math.floor(Math.random() * resolvedValues.length)];
        const picFilePath = `${baseImagePath}${i}.jpg`;
        const createdAt = new Date(baseCreatedAt.getTime() + Math.random() * (Date.now() - baseCreatedAt.getTime()));
        const updatedAt = new Date(baseUpdatedAt.getTime() + Math.random() * (Date.now() - baseUpdatedAt.getTime()));
        const deletedAt = null; // Assuming no records are deleted
        const sourceCameraId = Math.floor(Math.random() * 17) + 1;
        const alarmRuleId = Math.floor(Math.random() * 6) + 1;
        const alarmType = alarmTypes[Math.floor(Math.random() * alarmTypes.length)];
        const confidence = (Math.random() * 0.2 + 0.8).toFixed(2); // Random confidence between 0.8 and 1.0

        const createdAtStr = createdAt.toISOString().replace('T', ' ').substring(0, 23);
        const updatedAtStr = updatedAt.toISOString().replace('T', ' ').substring(0, 23);

        sql += `(${i}, ${resolved}, '${picFilePath}', '${createdAtStr}', '${updatedAtStr}', ${deletedAt}, ${sourceCameraId}, ${alarmRuleId}, '${alarmType}', ${confidence})`;
        if (i < numRecords + 2) {
            sql += ',\n';
        }
    }

    sql += ';';
    return sql;
}

// Example usage: Generate 100 test records
console.log(generateSQLInsertStatements(100));