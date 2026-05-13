import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function LeaderboardPage() {
  const session = await auth();

  const users = await prisma.user.findMany({
    orderBy: { points: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      points: true,
      role: true,
      _count: { select: { bets: true } },
    },
  });

  const myRank = session
    ? users.findIndex((u) => u.id === session.user.id) + 1
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Leaderboard</h1>

      {myRank && (
        <p className="text-sm text-gray-400 mb-4">
          You are ranked <span className="text-white font-semibold">#{myRank}</span>
        </p>
      )}

      <div className="space-y-2">
        {users.map((user, i) => {
          const isMe = session?.user.id === user.id;
          return (
            <div
              key={user.id}
              className={`flex items-center gap-4 bg-gray-900 border rounded-xl px-5 py-3 ${isMe ? "border-blue-700" : "border-gray-800"}`}
            >
              <span className={`text-lg font-bold w-6 shrink-0 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-gray-600"}`}>
                {i + 1}
              </span>
              {user.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user.name ?? user.email}</p>
                <p className="text-xs text-gray-500">{user._count.bets} bet{user._count.bets !== 1 ? "s" : ""}</p>
              </div>
              <span className="text-green-400 font-semibold">{user.points.toLocaleString()} pts</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
