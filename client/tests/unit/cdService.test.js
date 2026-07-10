// axios est entièrement mocké.

import axios from "axios";
import { getCDs, addCD, deleteCD } from "../../src/services/cdService";

jest.mock("axios");

const API_URL = "http://localhost:5005/api/cds";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("cdService.getCDs", () => {
  it("appelle GET sur l'URL de l'API et retourne les données", async () => {
    // Arrange
    const cds = [
      { id: 1, title: "A", artist: "X", year: 2000 },
      { id: 2, title: "B", artist: "Y", year: 2010 },
    ];
    axios.get.mockResolvedValue({ data: cds });

    // Act
    const result = await getCDs();

    // Assert
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(API_URL);
    expect(result).toEqual(cds);
  });

  it("propage l'erreur si la requête échoue", async () => {
    // Arrange
    axios.get.mockRejectedValue(new Error("Network Error"));

    // Act & Assert
    await expect(getCDs()).rejects.toThrow("Network Error");
  });
});

describe("cdService.addCD", () => {
  it("appelle POST avec le CD et retourne la ressource créée", async () => {
    // Arrange
    const newCd = { title: "New", artist: "Z", year: 2020 };
    const created = { id: 3, ...newCd };
    axios.post.mockResolvedValue({ data: created });

    // Act
    const result = await addCD(newCd);

    // Assert
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(API_URL, newCd);
    expect(result).toEqual(created);
  });

  it("propage l'erreur si la création échoue", async () => {
    // Arrange
    axios.post.mockRejectedValue(new Error("Request failed"));

    // Act & Assert
    await expect(addCD({ title: "X" })).rejects.toThrow("Request failed");
  });
});

describe("cdService.deleteCD", () => {
  it("appelle DELETE sur l'URL de l'API avec l'id", async () => {
    // Arrange
    axios.delete.mockResolvedValue({});

    // Act
    const result = await deleteCD(5);

    // Assert
    expect(axios.delete).toHaveBeenCalledTimes(1);
    expect(axios.delete).toHaveBeenCalledWith(`${API_URL}/5`);
    // deleteCD ne retourne rien
    expect(result).toBeUndefined();
  });

  it("propage l'erreur si la suppression échoue", async () => {
    // Arrange
    axios.delete.mockRejectedValue(new Error("delete failed"));

    // Act & Assert
    await expect(deleteCD(5)).rejects.toThrow("delete failed");
  });
});
