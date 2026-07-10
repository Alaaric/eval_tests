// Plutôt que de mocker chaque réponse à la main, on branche le mock axios sur un
import axios from "axios";
import { getCDs, addCD, deleteCD } from "../../src/services/cdService";

jest.mock("axios");

// --- Faux backend en mémoire, aligné sur le comportement de l'API réelle ---
let store;
let nextId;

function resetBackend() {
  store = [];
  nextId = 1;
}

function idFromUrl(url) {
  return Number(url.split("/").pop());
}

beforeEach(() => {
  jest.clearAllMocks();
  resetBackend();

  // GET /api/cds -> liste triée par id croissant (comme "ORDER BY id ASC")
  axios.get.mockImplementation(async () => ({
    data: [...store].sort((a, b) => a.id - b.id),
  }));

  axios.post.mockImplementation(async (_url, body) => {
    if (!body || !body.title || !body.artist || body.year === undefined) {
      const error = new Error("Request failed with status code 500");
      error.response = { status: 500, data: { error: "champ obligatoire manquant" } };
      throw error;
    }
    const created = { id: nextId++, title: body.title, artist: body.artist, year: body.year };
    store.push(created);
    return { status: 201, data: created };
  });

  axios.delete.mockImplementation(async (url) => {
    store = store.filter((cd) => cd.id !== idFromUrl(url));
    return { status: 204, data: "" };
  });
});

describe("Contrat de liste (GET)", () => {
  it("retourne une liste vide quand le backend ne contient aucun CD", async () => {

    // Act
    const cds = await getCDs();

    // Assert
    expect(cds).toEqual([]);
  });

  it("retourne les CD triés par id, quel que soit l'ordre d'ajout", async () => {
    // Arrange
    await addCD({ title: "B", artist: "Second", year: 2010 });
    await addCD({ title: "A", artist: "First", year: 2000 });

    // Act
    const cds = await getCDs();

    // Assert
    expect(cds.map((cd) => cd.id)).toEqual([1, 2]);
    expect(cds[0].title).toBe("B");
  });
});

describe("Parcours ajout puis affichage", () => {
  it("crée un CD via le service et le retrouve ensuite dans la liste", async () => {
    // Arrange
    const cd = { title: "OK Computer", artist: "Radiohead", year: 1997 };

    // Act
    const created = await addCD(cd);
    const cds = await getCDs();

    // Assert
    expect(created).toMatchObject(cd);
    expect(created.id).toBe(1);
    expect(cds).toHaveLength(1);
    expect(cds[0]).toMatchObject(cd);
  });

  it("propage l'erreur du backend (500) quand un champ obligatoire manque", async () => {
    // Arrange
    const invalid = { artist: "No Title", year: 2020 };

    // Act & Assert
    await expect(addCD(invalid)).rejects.toThrow("Request failed with status code 500");
  });
});

describe("Parcours suppression", () => {
  it("supprime uniquement le CD ciblé et laisse les autres", async () => {
    // Arrange
    const a = await addCD({ title: "A", artist: "X", year: 2000 });
    await addCD({ title: "B", artist: "Y", year: 2010 });

    // Act
    await deleteCD(a.id);
    const cds = await getCDs();

    // Assert
    expect(cds).toHaveLength(1);
    expect(cds[0].title).toBe("B");
  });
});

describe("Parcours CRUD complet (comme l'enchaînerait le frontend)", () => {
  it("ajoute, liste, supprime puis vérifie la liste vide", async () => {
    // Arrange
    const cd = { title: "Discovery", artist: "Daft Punk", year: 2001 };

    // Act + Assert
    const created = await addCD(cd);
    expect(created.id).toBeDefined();

    // Act + Assert
    let cds = await getCDs();
    expect(cds).toHaveLength(1);

    // Act + Assert
    await deleteCD(created.id);
    cds = await getCDs();
    expect(cds).toEqual([]);
  });
});
