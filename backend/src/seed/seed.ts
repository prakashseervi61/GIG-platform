import { pool } from "../db/pool";
import { hashPassword } from "../utils/password";

interface SeedUser {
  name: string;
  phone?: string;
  email?: string;
  password: string;
  role: "customer" | "worker" | "coop_admin" | "federation_admin";
}

interface SeedSkill {
  name: string;
  category: string;
  description: string;
}

interface SeedService {
  name: string;
  category: string;
  description: string;
  basePrice: number;
  emergencyAvailable: boolean;
  skills: string[];
}

const COOPERATIVES = [
  { name: "Coimbatore Workers Cooperative", registrationNumber: "REG-COE-001", location: "Coimbatore North", latitude: 11.0168, longitude: 76.9558, contact: "+91 90000 00001" },
  { name: "Chennai Service Cooperative", registrationNumber: "REG-CHE-001", location: "Chennai Central", latitude: 13.0827, longitude: 80.2707, contact: "+91 90000 00002" }
];

const ADMINS: SeedUser[] = [
  { name: "Federation Admin", email: "federation@coop.example", password: "admin@12345", role: "federation_admin" },
  { name: "Coimbatore Coop Admin", email: "coimbatore.admin@coop.example", password: "admin@12345", role: "coop_admin" },
  { name: "Chennai Coop Admin", email: "chennai.admin@coop.example", password: "admin@12345", role: "coop_admin" }
];

const DEMO_USERS: SeedUser[] = [
  { name: "Aarav Customer", phone: "9876500001", password: "customer@123", role: "customer" },
  { name: "Ramesh Plumber", phone: "9876500002", password: "worker@123", role: "worker" },
  { name: "Sita Electrician", phone: "9876500003", password: "worker@123", role: "worker" },
  { name: "Murugan Carpenter", phone: "9876500011", password: "worker@123", role: "worker" },
  { name: "Lakshmi Cleaner", phone: "9876500012", password: "worker@123", role: "worker" },
  { name: "Kannan Painter", phone: "9876500021", password: "worker@123", role: "worker" },
  { name: "Meena Gardener", phone: "9876500022", password: "worker@123", role: "worker" },
  { name: "Ravi Driver", phone: "9876500023", password: "worker@123", role: "worker" },
  { name: "Fatima Caregiver", phone: "9876500024", password: "worker@123", role: "worker" },
  { name: "Arun Appliance Tech", phone: "9876500025", password: "worker@123", role: "worker" },
  { name: "Ganesh Electrician", phone: "9876500026", password: "worker@123", role: "worker" },
  { name: "Divya Painter", phone: "9876500027", password: "worker@123", role: "worker" }
];

const SKILLS: SeedSkill[] = [
  { name: "Plumbing Repair", category: "Plumbing", description: "Pipe fitting, leak repair and fixture installation" },
  { name: "Electrical Wiring", category: "Electrical", description: "Wiring, switchboard and lighting installation" },
  { name: "Home Cleaning", category: "Cleaning", description: "Deep cleaning and sanitization services" },
  { name: "Carpentry", category: "Carpentry", description: "Furniture assembly and woodwork repair" },
  { name: "Wall Painting", category: "Painting", description: "Interior and exterior wall painting and touch-ups" },
  { name: "Garden Maintenance", category: "Gardening", description: "Lawn care, pruning and plant maintenance" },
  { name: "Driving", category: "Drivers", description: "Local drop and outstation driving" },
  { name: "Caregiving", category: "Caregivers", description: "Elder, child and post-operative care support" },
  { name: "Appliance Repair", category: "Appliance Repair", description: "Washing machine, fridge and AC servicing" }
];

const SERVICES: SeedService[] = [
  { name: "Emergency Plumbing", category: "Plumbing", description: "Urgent leak and pipe repair", basePrice: 500, emergencyAvailable: true, skills: ["Plumbing Repair"] },
  { name: "Plumbing Repair", category: "Plumbing", description: "Standard plumbing maintenance", basePrice: 300, emergencyAvailable: false, skills: ["Plumbing Repair"] },
  { name: "Electrical Installation", category: "Electrical", description: "Fan, light and switch installation", basePrice: 400, emergencyAvailable: false, skills: ["Electrical Wiring"] },
  { name: "Emergency Electrical Repair", category: "Electrical", description: "Urgent electrical fault repair", basePrice: 600, emergencyAvailable: true, skills: ["Electrical Wiring"] },
  { name: "Home Deep Cleaning", category: "Cleaning", description: "Full home 2BHK deep cleaning", basePrice: 1200, emergencyAvailable: false, skills: ["Home Cleaning"] },
  { name: "Furniture Assembly", category: "Carpentry", description: "Assembly of purchased furniture", basePrice: 350, emergencyAvailable: false, skills: ["Carpentry"] },
  { name: "Interior Wall Painting", category: "Painting", description: "Two-wall interior painting finish", basePrice: 800, emergencyAvailable: false, skills: ["Wall Painting"] },
  { name: "Garden Maintenance", category: "Gardening", description: "Lawn mowing, pruning and planting", basePrice: 450, emergencyAvailable: false, skills: ["Garden Maintenance"] },
  { name: "Driver on Hire", category: "Drivers", description: "Local pickup and drop with a verified driver", basePrice: 300, emergencyAvailable: false, skills: ["Driving"] },
  { name: "Elder Care Support", category: "Caregivers", description: "Companionship and daily assistance for elders", basePrice: 500, emergencyAvailable: false, skills: ["Caregiving"] },
  { name: "Appliance Servicing", category: "Appliance Repair", description: "Diagnosis and repair for home appliances", basePrice: 450, emergencyAvailable: false, skills: ["Appliance Repair"] }
];

const WORKER_SKILLS: Record<string, { skill: string; experienceLevel: number }[]> = {
  "Ramesh Plumber": [
    { skill: "Plumbing Repair", experienceLevel: 5 },
    { skill: "Carpentry", experienceLevel: 2 }
  ],
  "Sita Electrician": [
    { skill: "Electrical Wiring", experienceLevel: 4 }
  ],
  "Ganesh Electrician": [
    { skill: "Electrical Wiring", experienceLevel: 2 },
    { skill: "Appliance Repair", experienceLevel: 3 }
  ],
  "Murugan Carpenter": [
    { skill: "Carpentry", experienceLevel: 3 }
  ],
  "Lakshmi Cleaner": [
    { skill: "Home Cleaning", experienceLevel: 2 }
  ],
  "Kannan Painter": [
    { skill: "Wall Painting", experienceLevel: 6 }
  ],
  "Divya Painter": [
    { skill: "Wall Painting", experienceLevel: 2 }
  ],
  "Meena Gardener": [
    { skill: "Garden Maintenance", experienceLevel: 4 }
  ],
  "Ravi Driver": [
    { skill: "Driving", experienceLevel: 5 }
  ],
  "Fatima Caregiver": [
    { skill: "Caregiving", experienceLevel: 3 }
  ],
  "Arun Appliance Tech": [
    { skill: "Appliance Repair", experienceLevel: 5 }
  ]
};

// All workers sit inside Coimbatore so "nearby" search returns real results.
const WORKER_LOCATIONS: Record<string, { latitude: number; longitude: number; hourlyRate: number }> = {
  "Ramesh Plumber": { latitude: 11.0208, longitude: 76.9628, hourlyRate: 350 },
  "Sita Electrician": { latitude: 11.0125, longitude: 76.9489, hourlyRate: 400 },
  "Ganesh Electrician": { latitude: 11.0352, longitude: 76.9711, hourlyRate: 330 },
  "Murugan Carpenter": { latitude: 11.0028, longitude: 76.9328, hourlyRate: 320 },
  "Lakshmi Cleaner": { latitude: 11.0300, longitude: 76.9380, hourlyRate: 280 },
  "Kannan Painter": { latitude: 11.0189, longitude: 76.9512, hourlyRate: 380 },
  "Divya Painter": { latitude: 11.0412, longitude: 76.9603, hourlyRate: 300 },
  "Meena Gardener": { latitude: 11.0091, longitude: 76.9874, hourlyRate: 260 },
  "Ravi Driver": { latitude: 11.0244, longitude: 76.9447, hourlyRate: 300 },
  "Fatima Caregiver": { latitude: 11.0136, longitude: 76.9703, hourlyRate: 320 },
  "Arun Appliance Tech": { latitude: 11.0271, longitude: 76.9866, hourlyRate: 450 }
};

async function upsertCooperative(name: string, registrationNumber: string, location: string, latitude: number, longitude: number, contact: string) {
  await pool.query(
    `INSERT INTO cooperatives (name, registration_number, location, latitude, longitude, contact, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'active')
     ON CONFLICT (registration_number) DO UPDATE SET name = EXCLUDED.name, location = EXCLUDED.location,
       latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, contact = EXCLUDED.contact`,
    [name, registrationNumber, location, latitude, longitude, contact]
  );
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM cooperatives WHERE registration_number = $1`, [registrationNumber]
  );
  return { id: rows[0].id, referenceNumber: registrationNumber };
}

async function insertUser(user: SeedUser): Promise<{ id: string; name: string }> {
  const passwordHash = await hashPassword(user.password);
  const identifier = user.phone ?? user.email!;
  const kind = user.phone ? "phone" : "email";
  const existing = await pool.query(
    `SELECT id, name FROM users WHERE phone = $1 OR email = $1`, [identifier]
  );
  const { rows } = existing;
  if (rows[0]) return { id: rows[0].id as string, name: rows[0].name as string };

  const { rows: inserted } = await pool.query<{ id: string }>(
    kind === "phone"
      ? `INSERT INTO users (name, phone, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`
      : `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`,
    [user.name, identifier, passwordHash, user.role]
  );
  return { id: inserted[0].id, name: user.name };
}

async function upsertSkill(skill: SeedSkill): Promise<{ id: string }> {
  await pool.query(
    `INSERT INTO skills (name, category, description) VALUES ($1, $2, $3)
     ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category, description = EXCLUDED.description`,
    [skill.name, skill.category, skill.description]
  );
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM skills WHERE name = $1`, [skill.name]);
  return { id: rows[0].id };
}

async function upsertService(service: SeedService, skillIds: Map<string, string>): Promise<void> {
  await pool.query(
    `INSERT INTO services (name, category, description, base_price, emergency_available, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category, description = EXCLUDED.description,
       base_price = EXCLUDED.base_price, emergency_available = EXCLUDED.emergency_available`,
    [service.name, service.category, service.description, service.basePrice, service.emergencyAvailable]
  );
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM services WHERE name = $1`, [service.name]);
  const serviceId = rows[0].id;
  for (const skillName of service.skills) {
    const skillId = skillIds.get(skillName);
    if (!skillId) continue;
    await pool.query(
      `INSERT INTO service_skills (service_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [serviceId, skillId]
    );
  }
}

async function seed(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const skillIds = new Map<string, string>();
    for (const skill of SKILLS) {
      const { id } = await upsertSkill(skill);
      skillIds.set(skill.name, id);
    }
    for (const service of SERVICES) {
      await upsertService(service, skillIds);
    }

    const coopRows: { id: string }[] = [];
    for (const coop of COOPERATIVES) {
      const created = await upsertCooperative(coop.name, coop.registrationNumber, coop.location, coop.latitude, coop.longitude, coop.contact);
      coopRows.push({ id: created.id });
    }

    const adminUsers: { id: string; role: string }[] = [];
    for (const admin of ADMINS) {
      const user = await insertUser(admin);
      adminUsers.push({ id: user.id, role: admin.role });
    }

    const COOP_ADMIN_MAP: Record<string, string> = {
      "coimbatore.admin@coop.example": "REG-COE-001",
      "chennai.admin@coop.example": "REG-CHE-001"
    };
    for (const [adminEmail, registrationNumber] of Object.entries(COOP_ADMIN_MAP)) {
      await client.query(
        `UPDATE cooperatives SET admin_user_id = (
           SELECT id FROM users WHERE email = $1
         ) WHERE registration_number = $2 AND $1 IN (SELECT email FROM users)`,
        [adminEmail, registrationNumber]
      );
    }

    const demoUsers: { id: string; name: string; role: string }[] = [];
    for (const demo of DEMO_USERS) {
      const user = await insertUser(demo);
      demoUsers.push({ id: user.id, name: user.name, role: demo.role });
      if (demo.role === "customer") continue;

      const coop = coopRows[0];
      const skills = WORKER_SKILLS[demo.name] ?? [];
      const location = WORKER_LOCATIONS[demo.name];
      const { rows: workerRows } = await client.query<{ id: string }>(
        `INSERT INTO workers (user_id, cooperative_id, latitude, longitude, verification_status, is_available, hourly_rate)
         VALUES ($1, $2, $3, $4, 'approved', true, $5)
         ON CONFLICT (user_id) DO UPDATE SET cooperative_id = EXCLUDED.cooperative_id,
           latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, hourly_rate = EXCLUDED.hourly_rate
         RETURNING id`,
        [user.id, coop.id, location?.latitude ?? null, location?.longitude ?? null, location?.hourlyRate ?? 300]
      );
      const workerId = workerRows[0].id;

      for (const skill of skills) {
        const skillId = skillIds.get(skill.skill);
        if (!skillId) continue;
        await client.query(
          `INSERT INTO worker_skills (worker_id, skill_id, experience_level) VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [workerId, skillId, skill.experienceLevel]
        );
      }
    }

    await client.query("COMMIT");
    console.log("Seed data applied successfully.");
    console.log(`  - ${coopRows.length} cooperative(s)`);
    console.log(`  - ${adminUsers.length} admin user(s)`);
    console.log(`  - ${demoUsers.length} demo user(s)`);
    console.log(`  - ${SKILLS.length} skill(s), ${SERVICES.length} service(s)`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

seed()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await pool.end();
    process.exit(1);
  });