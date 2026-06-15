using System.Text;
using EFRM.API.Middleware;
using EFRM.Infrastructure.Data;
using EFRM.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// ── Serilog ──────────────────────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/efrm-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// ── Database ─────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<EfrmDbContext>(opts =>
    opts.UseSqlServer(
        builder.Configuration.GetConnectionString("EFRM"),
        sql => sql.CommandTimeout(60).EnableRetryOnFailure(3)));

// ── Redis Cache ───────────────────────────────────────────────────────────────
builder.Services.AddStackExchangeRedisCache(opts =>
    opts.Configuration = builder.Configuration.GetConnectionString("Redis"));

// ── Application Services ──────────────────────────────────────────────────────
builder.Services.AddScoped<AccessControlService>();
builder.Services.AddScoped<ApprovalEngineService>();
builder.Services.AddScoped<AuthService>();

// ── JWT Authentication ────────────────────────────────────────────────────────
var jwtKey   = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT key not configured");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "EFRM";
var jwtAud    = builder.Configuration["Jwt:Audience"] ?? "EFRM-Users";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = jwtIssuer,
            ValidAudience            = jwtAud,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew                = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization();

// ── Controllers & CORS ───────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddCors(opts => opts.AddPolicy("Angular", p =>
    p.WithOrigins(builder.Configuration["Cors:AllowedOrigins"]?.Split(',') ?? ["http://localhost:4200"])
     .AllowAnyHeader()
     .AllowAnyMethod()
     .AllowCredentials()));

// ── Swagger / OpenAPI ─────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title   = "EFRM API – Uttar Pradesh Gramin Bank",
        Version = "v1",
        Description = "Enterprise Fraud Risk Management REST API"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In   = ParameterLocation.Header,
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = []
    });
});

// ── Health Checks ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks()
    .AddDbContextCheck<EfrmDbContext>("sql-server");

var app = builder.Build();

// ── Middleware pipeline ───────────────────────────────────────────────────────
app.UseSerilogRequestLogging();
app.UseMiddleware<ExceptionMiddleware>();
app.UseMiddleware<AuditMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "EFRM v1"));
}

app.UseHttpsRedirection();
app.UseCors("Angular");
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<LocationScopeMiddleware>(); // injects visible location IDs into request context

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
