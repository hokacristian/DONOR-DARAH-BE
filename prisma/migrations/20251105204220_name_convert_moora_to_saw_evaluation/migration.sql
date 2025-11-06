/*
  Warnings:

  - You are about to drop the `moora_calculations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."moora_calculations" DROP CONSTRAINT "moora_calculations_examination_id_fkey";

-- DropTable
DROP TABLE "public"."moora_calculations";

-- CreateTable
CREATE TABLE "saw_evaluations" (
    "id" TEXT NOT NULL,
    "examination_id" TEXT NOT NULL,
    "preference_value" DOUBLE PRECISION NOT NULL,
    "is_eligible" BOOLEAN NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saw_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saw_evaluations_examination_id_key" ON "saw_evaluations"("examination_id");

-- AddForeignKey
ALTER TABLE "saw_evaluations" ADD CONSTRAINT "saw_evaluations_examination_id_fkey" FOREIGN KEY ("examination_id") REFERENCES "donor_examinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
