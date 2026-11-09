-- CreateTable
CREATE TABLE `Rating` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `raterId` INTEGER NOT NULL,
    `targetType` ENUM('BUSINESS', 'DELIVERY', 'CLIENT') NOT NULL,
    `targetUserId` INTEGER NOT NULL,
    `businessId` INTEGER NULL,
    `deliveryId` INTEGER NULL,
    `score` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Rating_targetType_targetUserId_idx`(`targetType`, `targetUserId`),
    INDEX `Rating_businessId_idx`(`businessId`),
    INDEX `Rating_deliveryId_idx`(`deliveryId`),
    INDEX `Rating_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `Rating_orderId_raterId_targetType_key`(`orderId`, `raterId`, `targetType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Rating` ADD CONSTRAINT `Rating_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rating` ADD CONSTRAINT `Rating_raterId_fkey` FOREIGN KEY (`raterId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rating` ADD CONSTRAINT `Rating_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rating` ADD CONSTRAINT `Rating_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `BusinessProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rating` ADD CONSTRAINT `Rating_deliveryId_fkey` FOREIGN KEY (`deliveryId`) REFERENCES `DeliveryProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
