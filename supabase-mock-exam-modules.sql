-- Run in Supabase SQL Editor
-- Adds support for multi-course mock exams (MPC, BiPC) with 3 modules each.
-- Existing id='main' with flat questions[] continues to work (legacy).

-- mock_exams table already has: id (text PK), questions (jsonb), created_at
-- New format for id='mpc' or id='bipc': questions = { "modules": [ { "name": "Physics", "questions": [...] }, ... ] }
-- Legacy id='main': questions = [ { question, options, correct, explanation }, ... ]

-- No schema change needed - we use the same columns.
-- Example row for MPC: id='mpc', questions='{"modules":[{"name":"Physics","questions":[...]},{"name":"Chemistry","questions":[...]},{"name":"Mathematics","questions":[...]}]}'
