// On mocke le module qui exporte le pool pg. Le contrôleur fait
// `require("../configs/db")` -> il recevra ce mock à la place.
jest.mock("../../configs/db", () => ({
  query: jest.fn(),
}));

const pool = require("../../configs/db");
const cdController = require("../../Controllers/cdController");

// Fabrique un objet `res` Express factice : chaque méthode est un mock et
// `status` renvoie `res` pour permettre le chaînage `res.status(500).json(...)`.
function createRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("cdController.getAllCDs", () => {
  it("répond avec la liste des CD (200 implicite) triée par id", async () => {
    // Arrange
    const rows = [
      { id: 1, title: "A", artist: "X", year: 2000 },
      { id: 2, title: "B", artist: "Y", year: 2010 },
    ];
    pool.query.mockResolvedValue({ rows });
    const req = {};
    const res = createRes();

    // Act
    await cdController.getAllCDs(req, res);

    // Assert
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenCalledWith("SELECT * FROM cds ORDER BY id ASC");
    expect(res.json).toHaveBeenCalledWith(rows);
    expect(res.status).not.toHaveBeenCalled(); // pas de status() -> reste 200
  });

  it("renvoie une liste vide quand il n'y a aucun CD", async () => {
    // Arrange
    pool.query.mockResolvedValue({ rows: [] });
    const res = createRes();

    // Act
    await cdController.getAllCDs({}, res);

    // Assert
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("répond 500 avec le message d'erreur si la requête échoue", async () => {
    // Arrange
    pool.query.mockRejectedValue(new Error("DB down"));
    const res = createRes();

    // Act
    await cdController.getAllCDs({}, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "DB down" });
  });
});

describe("cdController.addCD", () => {
  it("crée un CD et répond 201 avec la ligne insérée", async () => {
    // Arrange
    const created = { id: 3, title: "New", artist: "Z", year: 2020 };
    pool.query.mockResolvedValue({ rows: [created] });
    const req = { body: { title: "New", artist: "Z", year: 2020 } };
    const res = createRes();

    // Act
    await cdController.addCD(req, res);

    // Assert
    expect(pool.query).toHaveBeenCalledWith(
      "INSERT INTO cds (title, artist, year) VALUES ($1, $2, $3) RETURNING *",
      ["New", "Z", 2020]
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

  it("transmet les champs manquants tels quels (undefined) à la requête", async () => {
    // Arrange
    pool.query.mockResolvedValue({ rows: [{}] });
    const req = { body: { title: "OnlyTitle" } };
    const res = createRes();

    // Act
    await cdController.addCD(req, res);

    // Assert
    expect(pool.query).toHaveBeenCalledWith(
      "INSERT INTO cds (title, artist, year) VALUES ($1, $2, $3) RETURNING *",
      ["OnlyTitle", undefined, undefined]
    );
  });

  it("répond 500 avec le message d'erreur si l'insertion échoue", async () => {
    // Arrange
    pool.query.mockRejectedValue(new Error("insert failed"));
    const req = { body: { title: "New", artist: "Z", year: 2020 } };
    const res = createRes();

    // Act
    await cdController.addCD(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "insert failed" });
  });
});

describe("cdController.deleteCD", () => {
  it("supprime le CD et répond 204 sans corps", async () => {
    // Arrange
    pool.query.mockResolvedValue({ rowCount: 1 });
    const req = { params: { id: "5" } };
    const res = createRes();

    // Act
    await cdController.deleteCD(req, res);

    // Assert
    expect(pool.query).toHaveBeenCalledWith("DELETE FROM cds WHERE id = $1", ["5"]);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.json).not.toHaveBeenCalled(); // 204 = No Content
  });

  it("répond quand même 204 si l'id n'existe pas (comportement actuel)", async () => {
    // Arrange
    pool.query.mockResolvedValue({ rowCount: 0 });
    const req = { params: { id: "999" } };
    const res = createRes();

    // Act
    await cdController.deleteCD(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledTimes(1);
  });

  it("répond 500 avec le message d'erreur si la suppression échoue", async () => {
    // Arrange
    pool.query.mockRejectedValue(new Error("delete failed"));
    const req = { params: { id: "5" } };
    const res = createRes();

    // Act
    await cdController.deleteCD(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "delete failed" });
  });
});
