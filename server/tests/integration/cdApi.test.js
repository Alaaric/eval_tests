const fs = require("fs");
const path = require("path");
const request = require("supertest");
const { PostgreSqlContainer } = require("@testcontainers/postgresql");

jest.setTimeout(120000);

let container;
let app;
let pool;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:17").start();

  process.env.URI_DB = container.getConnectionUri();

  app = require("../../app");
  pool = require("../../configs/db");

  const schema = fs.readFileSync(
    path.join(__dirname, "../../configs/import.sql"),
    "utf8"
  );
  await pool.query(schema);
});

afterAll(async () => {
  if (pool) await pool.end();
  if (container) await container.stop();
});

beforeEach(async () => {
  await pool.query("TRUNCATE TABLE cds RESTART IDENTITY");
});

describe("GET /api/cds", () => {
  it("retourne une liste vide quand la base ne contient aucun CD", async () => {

    // Act
    const res = await request(app).get("/api/cds");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("retourne les CD existants triés par id croissant", async () => {
    // Arrange
    await pool.query(
      "INSERT INTO cds (title, artist, year) VALUES ($1,$2,$3),($4,$5,$6)",
      ["Second", "B", 2010, "First", "A", 2000]
    );

    // Act
    const res = await request(app).get("/api/cds");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((cd) => cd.id)).toEqual([1, 2]); // tri par id ASC
    expect(res.body[0]).toMatchObject({ title: "Second", artist: "B", year: 2010 });
  });
});

describe("POST /api/cds", () => {
  it("crée un CD, répond 201 et le persiste réellement en base", async () => {
    // Arrange
    const newCd = { title: "OK Computer", artist: "Radiohead", year: 1997 };

    // Act
    const res = await request(app).post("/api/cds").send(newCd);

    // Assert : réponse HTTP
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject(newCd);
    expect(res.body.id).toBeDefined();

    // Assert : persistance réelle en base
    const { rows } = await pool.query("SELECT * FROM cds WHERE id = $1", [res.body.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject(newCd);
  });

  it("répond 500 quand un champ obligatoire est manquant (pas de validation)", async () => {
    // Arrange
    const invalid = { artist: "No Title", year: 2020 };

    // Act
    const res = await request(app).post("/api/cds").send(invalid);

    // Assert
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error");
  });
});

describe("DELETE /api/cds/:id", () => {
  it("supprime un CD existant, répond 204 et le retire de la base", async () => {
    // Arrange
    const { rows } = await pool.query(
      "INSERT INTO cds (title, artist, year) VALUES ($1,$2,$3) RETURNING id",
      ["To Delete", "X", 2001]
    );
    const id = rows[0].id;

    // Act
    const res = await request(app).delete(`/api/cds/${id}`);

    // Assert
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});

    // Assert
    const check = await pool.query("SELECT * FROM cds WHERE id = $1", [id]);
    expect(check.rows).toHaveLength(0);
  });

  it("répond 204 même si l'id n'existe pas (comportement actuel)", async () => {

    // Act
    const res = await request(app).delete("/api/cds/9999");

    // Assert
    expect(res.status).toBe(204);
  });
});

describe("Parcours CRUD complet", () => {
  it("ajoute, liste puis supprime un CD de bout en bout", async () => {
    // Arrange
    const cd = { title: "Discovery", artist: "Daft Punk", year: 2001 };

    // Act + Assert
    const created = await request(app).post("/api/cds").send(cd);
    expect(created.status).toBe(201);
    const id = created.body.id;

    // Act + Assert
    const afterAdd = await request(app).get("/api/cds");
    expect(afterAdd.body).toHaveLength(1);
    expect(afterAdd.body[0]).toMatchObject(cd);

    // Act + Assert
    const deleted = await request(app).delete(`/api/cds/${id}`);
    expect(deleted.status).toBe(204);

    // Act + Assert
    const afterDelete = await request(app).get("/api/cds");
    expect(afterDelete.body).toEqual([]);
  });
});
