// shared/baseController.js
export class BaseController {
  constructor(service, entityName = "Record") {
    this.service = service;
    this.entityName = entityName;
  }

  //  CREATE
  create = async (req, res, next) => {
    try {
      // Automatically add user info from JWT token
      const userData = {
        ...req.body,
        createdBy: req.user.username, // Store username from JWT token
      };
      
      const item = await this.service.create(userData);
      return res.status(201).json({
        success: true,
        message: `${this.entityName} created successfully`,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  };

  //  READ ALL
  getAll = async (req, res, next) => {
    try {
      const { page = 1, limit = 10  } = req.query;
      const items = await this.service.getAll(page, limit);
      return res.json({ success: true, ...items });
    } catch (error) {
      next(error);
    }
  };

  //  READ ONE
  getById = async (req, res, next) => {
    try {
      const item = await this.service.getById(req.params.id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: `${this.entityName} not found`,
        });
      }
      return res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  };

  //  UPDATE
  update = async (req, res, next) => {
    try {
      // Automatically add user info from JWT token
      const userData = {
        ...req.body,
        updatedBy: req.user.username, // Store username from JWT token
      };
      
      console.log(`🔵 [BaseController] Updating ${this.entityName}:`, {
        id: req.params.id,
        bodyBeforeMerge: req.body,
        userData: userData,
        fields: Object.keys(userData),
        updatedBy: userData.updatedBy,
        userFromJWT: req.user?.username,
      });
      
      const item = await this.service.update(req.params.id, userData);
      
      console.log(`✅ [BaseController] ${this.entityName} update result:`, {
        id: req.params.id,
        itemFound: !!item,
        itemData: item ? Object.keys(item.toJSON ? item.toJSON() : item) : null,
      });
      if (!item) {
        return res.status(404).json({
          success: false,
          message: `${this.entityName} not found`,
        });
      }
      
      console.log(`✅ [BaseController] ${this.entityName} updated successfully:`, req.params.id);
      
      return res.json({
        success: true,
        message: `${this.entityName} updated successfully`,
        data: item,
      });
    } catch (error) {
      console.error(`❌ [BaseController] Error updating ${this.entityName}:`, error);
      console.error("Error details:", {
        entityName: this.entityName,
        id: req.params.id,
        errorMessage: error.message,
        errorStack: error.stack,
      });
      next(error);
    }
  };

  // SOFT DELETE
  softDelete = async (req, res, next) => {
    try {
      // Automatically add user info from JWT token
      const userData = {
        deletedBy: req.user.username, // Store username from JWT token
      };
      
      const item = await this.service.softDelete(req.params.id, userData);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: `${this.entityName} not found`,
        });
      }
      return res.json({
        success: true,
        message: `${this.entityName} soft deleted successfully`,
      });
    } catch (error) {
      next(error);
    }
  };

  //  RESTORE
  restore = async (req, res, next) => {
    try {
      const item = await this.service.restore(req.params.id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: `${this.entityName} not found or not deleted`,
        });
      }
      return res.json({
        success: true,
        message: `${this.entityName} restored successfully`,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  };

  //  HARD DELETE
  hardDelete = async (req, res, next) => {
    try {
      const item = await this.service.hardDelete(req.params.id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: `${this.entityName} not found`,
        });
      }
      return res.json({
        success: true,
        message: `${this.entityName} permanently deleted`,
      });
    } catch (error) {
      next(error);
    }
  };
}
