exports.up = function (knex) {
  return knex.schema.createTable('idempotency_keys', (table) => {
    table.string('key').primary();
    table.string('request_path').notNullable();
    table.json('response_body').notNullable();
    table.integer('status_code').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('idempotency_keys');
};
