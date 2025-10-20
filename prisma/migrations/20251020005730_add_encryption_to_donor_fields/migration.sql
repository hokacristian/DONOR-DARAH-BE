/*
  Warnings:

  - A unique constraint covering the columns `[examination_id,criteria_id]` on the table `examination_criteria_values` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "donors" ALTER COLUMN "birth_date" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "examination_criteria_values_examination_id_criteria_id_key" ON "examination_criteria_values"("examination_id", "criteria_id");
