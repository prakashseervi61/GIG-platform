import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import type { AuthUser } from "../types";
import {
  getMyLocation,
  getService,
  listServiceCatalog,
  saveMyLocation,
  searchNearbyWorkers,
  listMyAddresses,
  addMyAddress,
  editMyAddress,
  makeMyAddressDefault,
  removeMyAddress
} from "../services/discovery.service";
import type {
  CreateAddressInput,
  ListServicesQueryInput,
  SaveLocationInput,
  SearchWorkersQueryInput,
  UpdateAddressInput
} from "../schemas/discovery.schema";

const listServices = asyncHandler(async (req: Request, res: Response) => {
  const query = (req.validated?.query as ListServicesQueryInput) ?? {};
  const services = await listServiceCatalog(query);
  res.status(200).json({ services, count: services.length });
});

const getServiceById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validated?.params as { id: string };
  const service = await getService(id);
  res.status(200).json({ service });
});

const saveLocation = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const body = req.validated?.body as SaveLocationInput;
  const location = await saveMyLocation(user, body);
  res.status(200).json({ message: "Location saved", location });
});

const getLocation = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const location = await getMyLocation(user);
  res.status(200).json({ location });
});

const listAddresses = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const addresses = await listMyAddresses(user);
  res.status(200).json({ addresses, count: addresses.length });
});

const createAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const body = req.validated?.body as CreateAddressInput;
  const address = await addMyAddress(user, body);
  res.status(201).json({ message: "Address saved", address });
});

const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const { id } = req.validated?.params as { id: string };
  const body = req.validated?.body as UpdateAddressInput;
  const address = await editMyAddress(user, id, body);
  res.status(200).json({ message: "Address updated", address });
});

const setDefaultAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const { id } = req.validated?.params as { id: string };
  const address = await makeMyAddressDefault(user, id);
  res.status(200).json({ message: "Default address updated", address });
});

const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const { id } = req.validated?.params as { id: string };
  await removeMyAddress(user, id);
  res.status(200).json({ message: "Address deleted" });
});

const searchWorkers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated?.query as SearchWorkersQueryInput;
  const workers = await searchNearbyWorkers(query);
  res.status(200).json({ query, workers, count: workers.length });
});

export const discoveryController = {
  listServices,
  getServiceById,
  saveLocation,
  getLocation,
  searchWorkers,
  listAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress
};