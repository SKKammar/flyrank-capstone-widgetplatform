exports.up = function(knex) {
  return knex.schema.createTable('users', (t) => {
    t.string('id').primary();
    t.string('email').unique().notNullable();
    t.string('password_hash').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};
