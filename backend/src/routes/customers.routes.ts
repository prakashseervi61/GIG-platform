import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { discoveryController } from "../controllers/discovery.controller";
import { createAddressSchema, idParamSchema, saveLocationSchema, updateAddressSchema } from "../schemas/discovery.schema";

export const customersRouter = Router();

const customerOnly = [authenticate, requireRole("customer")] as const;

customersRouter.get("/me/location", ...customerOnly, discoveryController.getLocation);
customersRouter.put(
  "/me/location",
  ...customerOnly,
  validate(saveLocationSchema),
  discoveryController.saveLocation
);

// Saved addresses (multiple per customer, one default)
customersRouter.get("/me/addresses", ...customerOnly, discoveryController.listAddresses);
customersRouter.post(
  "/me/addresses",
  ...customerOnly,
  validate(createAddressSchema),
  discoveryController.createAddress
);
customersRouter.patch(
  "/me/addresses/:id",
  ...customerOnly,
  validate(idParamSchema, "params"),
  validate(updateAddressSchema),
  discoveryController.updateAddress
);
customersRouter.post(
  "/me/addresses/:id/default",
  ...customerOnly,
  validate(idParamSchema, "params"),
  discoveryController.setDefaultAddress
);
customersRouter.delete(
  "/me/addresses/:id",
  ...customerOnly,
  validate(idParamSchema, "params"),
  discoveryController.deleteAddress
);
