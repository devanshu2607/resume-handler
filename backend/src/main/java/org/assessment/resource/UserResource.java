package org.assessment.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.assessment.persistence.User;
import org.assessment.service.UserService;
import java.util.Map;

@Path("/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UserResource {

    private static final String MESSAGE_KEY = "message";

    private final UserService userService;

    @Inject
    public UserResource(UserService userService) {
        this.userService = userService;
    }

    @POST
    @Path("/signup")
    public Response signup(Map<String, String> payload) {
        try {
            String idStr = payload.get("id");
            Long id = idStr != null ? Long.parseLong(idStr) : null;
            String email = payload.get("email");
            String password = payload.get("password");
            User user = userService.signup(id, email, password);
            return Response.status(201).entity(user).build();
        } catch (IllegalArgumentException e) {
            return Response.status(400).entity(Map.of(MESSAGE_KEY, e.getMessage())).build();
        }
    }

    @POST
    @Path("/verify")
    public Response verify(Map<String, String> payload) {
        if (payload == null || !payload.containsKey("token")) {
            return Response.status(400).entity(Map.of(MESSAGE_KEY, "Token is required")).build();
        }
        boolean verified = userService.verifyEmail(payload.get("token"));
        if (verified) {
            return Response.ok(Map.of("success", true, MESSAGE_KEY, "Email validated")).build();
        }
        return Response.status(400).entity(Map.of(MESSAGE_KEY, "Invalid or expired token")).build();
    }

    @POST
    @Path("/login")
    public Response login(Map<String, String> payload) {
        if (payload == null) {
            return Response.status(400).entity(Map.of(MESSAGE_KEY, "Credentials required")).build();
        }
        String idStr = payload.get("id");
        Long id = idStr != null ? Long.parseLong(idStr) : null;
        User user = userService.login(id, payload.get("email"), payload.get("password"));
        if (user != null) {
            return Response.ok(user).build();
        }
        return Response.status(401).entity(Map.of(MESSAGE_KEY, "Invalid email or password")).build();
    }

    @GET
    @Path("/{id}")
    public Response getUser(@PathParam("id") Long id, @QueryParam("email") String email) {
        User user;
        if (email != null && !email.trim().isEmpty()) {
            user = userService.findByIdAndEmail(id, email);
        } else {
            user = userService.findById(id);
        }

        if (user != null) {
            return Response.ok(user).build();
        }
        return Response.status(404).entity(Map.of(MESSAGE_KEY, "User not found")).build();
    }
}
