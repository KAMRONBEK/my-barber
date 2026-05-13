/** Seed catalog — override or extend in Firestore `serviceCatalog` for production. */
export const SERVICE_CATALOG_DEFAULT = [
  {
    id: 'svc_haircut',
    name: 'Haircut',
    default_duration_minutes: 45,
  },
  {
    id: 'svc_beard',
    name: 'Beard trim',
    default_duration_minutes: 30,
  },
];
