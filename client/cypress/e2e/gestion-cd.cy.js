// Titre unique pour éviter toute collision entre exécutions et rester idempotent.
const uniqueTitle = `E2E CD ${Date.now()}`;
const cd = { title: uniqueTitle, artist: "E2E Artist", year: "1999" };

describe("Gestion des CD (E2E)", () => {
  beforeEach(() => {
    // Arrange
    cy.visit("/");
  });

  it("affiche la page de gestion des CD", () => {
    // Assert
    cy.contains("h1", "Gestion des CD").should("be.visible");
    cy.contains("h2", "Ajouter un CD").should("be.visible");
    cy.contains("h2", "Liste des CD").should("be.visible");
  });

  it("ajoute un CD et l'affiche dans la liste", () => {
    // Act
    cy.get('input[name="title"]').type(cd.title);
    cy.get('input[name="artist"]').type(cd.artist);
    cy.get('input[name="year"]').type(cd.year);
    cy.contains("button", "Ajouter").click();

    // Assert
    cy.contains("li", cd.title)
      .should("be.visible")
      .and("contain", cd.artist)
      .and("contain", cd.year);
  });

  it("supprime le CD ajouté et le retire de la liste", () => {
    // Arrange
    cy.contains("li", uniqueTitle).should("exist");

    // Act
    cy.contains("li", uniqueTitle).within(() => {
      cy.contains("button", "Supprimer").click();
    });

    // Assert
    cy.contains("li", uniqueTitle).should("not.exist");
  });
});

describe("Gestion des CD - cas d'échec et limites (E2E)", () => {
  beforeEach(() => {
    // Arrange
    cy.visit("/");
  });

  it("bloque la soumission d'un formulaire vide (champs requis)", () => {
    // Arrange
    cy.intercept("POST", "**/api/cds").as("addReq");

    // Act
    cy.contains("button", "Ajouter").click();

    // Assert
    cy.get('input[name="title"]:invalid').should("exist");
    cy.get("@addReq.all").should("have.length", 0);
  });

  it("bloque la soumission si un champ est manquant", () => {
    // Arrange
    cy.intercept("POST", "**/api/cds").as("addReq");

    // Act
    cy.get('input[name="title"]').type("Sans année");
    cy.get('input[name="artist"]').type("Artiste");
    cy.contains("button", "Ajouter").click();

    // Assert
    cy.get('input[name="year"]:invalid').should("exist");
    cy.get("@addReq.all").should("have.length", 0);
  });

  it("affiche le message vide quand l'API renvoie une liste vide", () => {
    // Arrange
    cy.intercept("GET", "**/api/cds", { statusCode: 200, body: [] }).as("getEmpty");

    // Act
    cy.visit("/");
    cy.wait("@getEmpty");

    // Assert
    cy.contains("Aucun CD disponible").should("be.visible");
    cy.get("li").should("not.exist");
  });

  it("n'ajoute pas de CD si l'API échoue (500) et laisse remonter l'erreur non gérée", () => {
    // Arrange
    const title = `Echec ${Date.now()}`;
    cy.intercept("POST", "**/api/cds", {
      statusCode: 500,
      body: { error: "Erreur serveur" },
    }).as("addFail");

    cy.on("uncaught:exception", () => false);

    // Act
    cy.get('input[name="title"]').type(title);
    cy.get('input[name="artist"]').type("Artiste");
    cy.get('input[name="year"]').type("2020");
    cy.contains("button", "Ajouter").click();
    cy.wait("@addFail");

    // Assert
    cy.contains("h1", "Gestion des CD").should("be.visible");
    cy.contains("li", title).should("not.exist");
  });
});
