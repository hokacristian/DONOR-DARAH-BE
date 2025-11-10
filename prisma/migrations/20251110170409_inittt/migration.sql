/*
  Warnings:

  - You are about to drop the `saw_evaluations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."saw_evaluations" DROP CONSTRAINT "saw_evaluations_examination_id_fkey";

-- DropTable
DROP TABLE "public"."saw_evaluations";

-- CreateTable
CREATE TABLE "moora_calculations" (
    "id" TEXT NOT NULL,
    "examination_id" TEXT NOT NULL,
    "preference_value" DOUBLE PRECISION NOT NULL,
    "is_eligible" BOOLEAN NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moora_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "moora_calculations_examination_id_key" ON "moora_calculations"("examination_id");

-- AddForeignKey
ALTER TABLE "moora_calculations" ADD CONSTRAINT "moora_calculations_examination_id_fkey" FOREIGN KEY ("examination_id") REFERENCES "donor_examinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
