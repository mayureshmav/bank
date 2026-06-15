using EFRM.Infrastructure.Data;

namespace EFRM.Infrastructure.Services;

public class AuthService(EfrmDbContext db)
{
    public async Task InvalidateSessionAsync(int personId)
    {
        var sessions = db.UserSessions.Where(s => s.PersonId == personId && !s.IsRevoked);
        foreach (var s in sessions)
            s.IsRevoked = true;
        await db.SaveChangesAsync();
    }
}
