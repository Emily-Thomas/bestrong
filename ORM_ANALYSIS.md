# ORM Analysis: Should We Use Drizzle?

## Current State

### What We Have Now
- **Raw SQL** with `pg` (node-postgres)
- **Manual parameter binding** (`$1, $2, $3...`)
- **Manual JSONB parsing** (e.g., `plan_structure` needs manual `JSON.parse()`)
- **Dynamic query building** (e.g., `updateClient` builds UPDATE queries manually)
- **Type safety** only at compile time (TypeScript types, but no runtime validation)
- **Manual migration system** (SQL files + tracking table)

### Current Pain Points

1. **JSONB Handling**
   ```typescript
   // Current: Manual parsing everywhere
   if (typeof rec.plan_structure === 'string') {
     rec.plan_structure = JSON.parse(rec.plan_structure);
   }
   ```

2. **Dynamic Updates**
   ```typescript
   // Current: Manual query building
   const fields: string[] = [];
   const values: unknown[] = [];
   let paramCount = 1;
   if (input.first_name !== undefined) {
     fields.push(`first_name = $${paramCount++}`);
     values.push(input.first_name);
   }
   // ... repeat for each field
   ```

3. **Type Safety**
   - TypeScript types exist but aren't enforced at runtime
   - No validation of data coming from database
   - Easy to have type mismatches

4. **Boilerplate**
   - Repetitive CRUD patterns across services
   - Similar query patterns repeated

## What Drizzle Would Provide

### Benefits

1. **Type-Safe Queries**
   ```typescript
   // With Drizzle
   const client = await db.select().from(clients).where(eq(clients.id, id));
   // Full type inference, autocomplete, compile-time safety
   ```

2. **Automatic JSONB Handling**
   ```typescript
   // Drizzle handles JSONB automatically
   const rec = await db.select().from(recommendations).where(...);
   // plan_structure is already parsed as object
   ```

3. **Better Migration System**
   ```typescript
   // Schema defined in TypeScript
   export const clients = pgTable('clients', {
     id: serial('id').primaryKey(),
     firstName: varchar('first_name', { length: 255 }).notNull(),
     // ...
   });
   
   // Auto-generate migrations from schema changes
   drizzle-kit generate:pg
   ```

4. **Less Boilerplate**
   ```typescript
   // Dynamic updates become simple
   await db.update(clients)
     .set({ firstName: input.first_name })
     .where(eq(clients.id, id));
   ```

5. **Schema as Code**
   - Single source of truth for schema
   - Type-safe schema definitions
   - Auto-complete and validation

6. **Better Developer Experience**
   - Autocomplete for columns
   - Compile-time query validation
   - Better error messages

### Drawbacks

1. **Migration Effort**
   - Need to migrate existing codebase
   - Convert all services to use Drizzle
   - Convert schema.sql to Drizzle schema definitions
   - Update migration system

2. **Learning Curve**
   - Team needs to learn Drizzle API
   - Different query patterns
   - New concepts (schema definitions, relations, etc.)

3. **Additional Dependency**
   - Another package to maintain
   - Potential version conflicts
   - More complexity in build process

4. **Migration System Conflict**
   - Just created a raw SQL migration spec
   - Would need to adapt or replace it
   - Drizzle has its own migration system

5. **Performance**
   - Minimal overhead (Drizzle is lightweight)
   - But still an abstraction layer
   - Raw SQL is always fastest

6. **Complex Queries**
   - Some complex queries might be harder in Drizzle
   - May need to fall back to raw SQL for edge cases

## Recommendation: **Yes, but with a phased approach**

### Why Drizzle Specifically?

1. **Lightweight**: Minimal runtime overhead, no query builder bloat
2. **Type-Safe**: Full TypeScript support with inference
3. **SQL-Like**: Queries look similar to SQL, easier migration
4. **Modern**: Active development, good ecosystem
5. **Flexible**: Can use raw SQL when needed
6. **Migration Tool**: Built-in `drizzle-kit` for migrations

### Phased Migration Strategy

#### Phase 1: Setup (Week 1)
1. Install Drizzle and drizzle-kit
2. Define schema in TypeScript (parallel to existing schema.sql)
3. Set up Drizzle migration system
4. Keep existing system running

#### Phase 2: Migrate Services (Weeks 2-3)
1. Start with one service (e.g., `client.service.ts`)
2. Convert to Drizzle queries
3. Test thoroughly
4. Migrate remaining services one by one

#### Phase 3: Consolidate (Week 4)
1. Remove raw SQL queries
2. Use Drizzle migrations exclusively
3. Remove old migration scripts
4. Update documentation

### Implementation Example

#### Before (Current)
```typescript
export async function updateClient(
  id: number,
  input: Partial<CreateClientInput>
): Promise<Client | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;
  
  if (input.first_name !== undefined) {
    fields.push(`first_name = $${paramCount++}`);
    values.push(input.first_name);
  }
  // ... repeat for each field
  
  if (fields.length === 0) {
    return getClientById(id);
  }
  
  values.push(id);
  const query = `UPDATE clients SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
  const result = await pool.query<Client>(query, values);
  return result.rows[0] || null;
}
```

#### After (With Drizzle)
```typescript
export async function updateClient(
  id: number,
  input: Partial<CreateClientInput>
): Promise<Client | null> {
  const updateData: Partial<typeof clients.$inferInsert> = {};
  
  if (input.first_name !== undefined) updateData.firstName = input.first_name;
  if (input.last_name !== undefined) updateData.lastName = input.last_name;
  if (input.email !== undefined) updateData.email = input.email;
  // ... etc
  
  if (Object.keys(updateData).length === 0) {
    return getClientById(id);
  }
  
  const [updated] = await db
    .update(clients)
    .set(updateData)
    .where(eq(clients.id, id))
    .returning();
    
  return updated || null;
}
```

### Schema Definition Example

```typescript
// backend/src/db/schema.ts
import { pgTable, serial, varchar, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  dateOfBirth: timestamp('date_of_birth'),
  createdBy: integer('created_by').references(() => adminUsers.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const recommendations = pgTable('recommendations', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').notNull().references(() => clients.id),
  questionnaireId: integer('questionnaire_id').references(() => questionnaires.id),
  clientType: varchar('client_type', { length: 100 }).notNull(),
  sessionsPerWeek: integer('sessions_per_week').notNull(),
  sessionLengthMinutes: integer('session_length_minutes').notNull(),
  trainingStyle: varchar('training_style', { length: 100 }).notNull(),
  planStructure: jsonb('plan_structure').notNull(), // Auto-handled!
  aiReasoning: text('ai_reasoning'),
  status: varchar('status', { length: 50 }).default('draft'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### Migration System with Drizzle

Drizzle uses `drizzle-kit` for migrations:

```bash
# Generate migration from schema changes
npm run drizzle-kit generate

# Apply migrations
npm run drizzle-kit migrate
```

This would replace our current raw SQL migration system, but we could:
1. Keep the migration spec principles (versioning, tracking, idempotency)
2. Use Drizzle's migration system instead of raw SQL files
3. Still maintain separation of migrations and seeds

## Alternative: Hybrid Approach

### Keep Raw SQL, Add Query Builder

If full ORM migration is too much, consider:
- **Kysely**: Type-safe SQL query builder (no schema definitions)
- **Slonik**: Type-safe PostgreSQL client
- **Zapatos**: Type-safe PostgreSQL access

These provide type safety without full ORM migration.

## Decision Matrix

| Factor | Raw SQL (Current) | Drizzle ORM |
|--------|------------------|-------------|
| **Type Safety** | Compile-time only | Compile + Runtime |
| **JSONB Handling** | Manual | Automatic |
| **Boilerplate** | High | Low |
| **Learning Curve** | Low (already know SQL) | Medium |
| **Migration Effort** | None | High (one-time) |
| **Performance** | Fastest | Very fast (minimal overhead) |
| **Developer Experience** | Good | Excellent |
| **Migration System** | Custom (just built) | Built-in |
| **Complex Queries** | Easy | Easy (can use raw SQL) |
| **Schema Management** | SQL files | TypeScript + SQL |

## Final Recommendation

### **Yes, migrate to Drizzle** - but wait until after current migration system is stable

**Timeline:**
1. **Now**: Implement the raw SQL migration system we just spec'd
2. **Next Sprint**: Evaluate Drizzle migration
3. **Following Sprint**: Begin phased Drizzle adoption

**Rationale:**
- Current system works but has pain points (JSONB, boilerplate, type safety)
- Drizzle would significantly improve developer experience
- Migration effort is manageable with phased approach
- Can keep migration principles from our spec, just use Drizzle's tooling
- Better long-term maintainability

**If Not Now:**
- Current system is functional
- Migration is non-trivial effort
- Team might not be ready for change
- Can always migrate later when pain points become more acute

## Next Steps (If Proceeding)

1. **Research**: Review Drizzle docs, examples, community
2. **Proof of Concept**: Migrate one service to Drizzle
3. **Team Discussion**: Get team buy-in
4. **Plan Migration**: Create detailed migration plan
5. **Execute**: Phased rollout

## Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Drizzle Kit (Migrations)](https://orm.drizzle.team/kit-docs/overview)
- [Drizzle vs Prisma vs TypeORM](https://orm.drizzle.team/docs/comparison)

