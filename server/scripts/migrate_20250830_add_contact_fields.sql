-- Migración: agregar campos a contactos y orden a etapas_pipeline
ALTER TABLE contactos 
  ADD COLUMN IF NOT EXISTS tipo ENUM('lead','prospecto','cliente') DEFAULT 'lead' AFTER telefono,
  ADD COLUMN IF NOT EXISTS origen VARCHAR(80) AFTER tipo,
  ADD COLUMN IF NOT EXISTS notas TEXT AFTER origen;

ALTER TABLE etapas_pipeline 
  ADD COLUMN IF NOT EXISTS orden INT NOT NULL DEFAULT 0 AFTER color_hex;