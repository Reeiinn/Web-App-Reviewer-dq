-- Add IIAP as a new exam_type
-- NOTE: This must be committed on its own before the new value can be used in INSERTs
ALTER TYPE exam_type
ADD VALUE 'IIAP';