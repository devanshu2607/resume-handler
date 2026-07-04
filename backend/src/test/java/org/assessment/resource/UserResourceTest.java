package org.assessment.resource;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class UserResourceTest {

    private static String token;
    private static Long userId;
    private static final String EMAIL = "user_" + java.util.UUID.randomUUID().toString().substring(0, 8) + "@example.com";
    private static final String PASSWORD = "pass_" + java.util.UUID.randomUUID().toString().substring(0, 8);

    @Test
    @Order(1)
    void testSignupSuccess() {
        token = given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", EMAIL, "password", PASSWORD))
            .when()
            .post("/users/signup")
            .then()
            .statusCode(201)
            .body("email", is(EMAIL))
            .body("emailValidated", is(false))
            .body("validationToken", notNullValue())
            .extract()
            .path("validationToken");
    }

    @Test
    @Order(2)
    void testSignupDuplicateEmail() {
        given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", EMAIL, "password", "otherpass"))
            .when()
            .post("/users/signup")
            .then()
            .statusCode(400)
            .body("message", containsString("already exists"));
    }

    @Test
    @Order(3)
    void testLoginUnverified() {
        given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", EMAIL, "password", PASSWORD))
            .when()
            .post("/users/login")
            .then()
            .statusCode(200)
            .body("email", is(EMAIL))
            .body("emailValidated", is(false));
    }

    @Test
    @Order(4)
    void testLoginInvalidCredentials() {
        given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", EMAIL, "password", "wrongpass"))
            .when()
            .post("/users/login")
            .then()
            .statusCode(401);
    }

    @Test
    @Order(5)
    void testVerifyMissingToken() {
        given()
            .contentType(ContentType.JSON)
            .body(Map.of())
            .when()
            .post("/users/verify")
            .then()
            .statusCode(400)
            .body("message", is("Token is required"));
    }

    @Test
    @Order(6)
    void testVerifyInvalidToken() {
        given()
            .contentType(ContentType.JSON)
            .body(Map.of("token", "fake-token"))
            .when()
            .post("/users/verify")
            .then()
            .statusCode(400)
            .body("message", is("Invalid or expired token"));
    }

    @Test
    @Order(7)
    void testVerifySuccess() {
        given()
            .contentType(ContentType.JSON)
            .body(Map.of("token", token))
            .when()
            .post("/users/verify")
            .then()
            .statusCode(200)
            .body("success", is(true))
            .body("message", is("Email validated"));
    }

    @Test
    @Order(8)
    void testVerifyAlreadyVerified() {
        given()
            .contentType(ContentType.JSON)
            .body(Map.of("token", token))
            .when()
            .post("/users/verify")
            .then()
            .statusCode(400)
            .body("message", is("Invalid or expired token"));
    }

    @Test
    @Order(9)
    void testLoginVerified() {
        Number idVal = given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", EMAIL, "password", PASSWORD))
            .when()
            .post("/users/login")
            .then()
            .statusCode(200)
            .body("email", is(EMAIL))
            .body("emailValidated", is(true))
            .extract()
            .path("id");
        
        userId = idVal.longValue();
    }

    @Test
    @Order(10)
    void testGetUserById() {
        given()
            .when()
            .get("/users/" + userId)
            .then()
            .statusCode(200)
            .body("email", is(EMAIL));
    }

    @Test
    @Order(11)
    void testGetUserByIdAndEmail() {
        given()
            .queryParam("email", EMAIL)
            .when()
            .get("/users/" + userId)
            .then()
            .statusCode(200)
            .body("email", is(EMAIL));
    }

    @Test
    @Order(12)
    void testGetUserByIdAndWrongEmail() {
        given()
            .queryParam("email", "wrong@example.com")
            .when()
            .get("/users/" + userId)
            .then()
            .statusCode(404);
    }
}
