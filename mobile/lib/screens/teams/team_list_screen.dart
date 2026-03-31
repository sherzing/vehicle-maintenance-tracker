import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../providers/team_provider.dart';

class TeamListScreen extends StatefulWidget {
  const TeamListScreen({super.key});

  @override
  State<TeamListScreen> createState() => _TeamListScreenState();
}

class _TeamListScreenState extends State<TeamListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TeamProvider>().loadTeams();
    });
  }

  @override
  Widget build(BuildContext context) {
    final teamProvider = context.watch<TeamProvider>();
    final auth = context.read<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Teams'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => teamProvider.loadTeams(),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => auth.signOut(),
          ),
        ],
      ),
      body: _buildBody(teamProvider),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateDialog(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildBody(TeamProvider provider) {
    if (provider.loading && provider.teams.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (provider.error != null && provider.teams.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Error: ${provider.error}'),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => provider.loadTeams(),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (provider.teams.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.group_outlined,
                size: 64,
                color: Theme.of(context).colorScheme.onSurfaceVariant),
            const SizedBox(height: 16),
            Text(
              'No teams yet',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            const Text('Create a team to get started'),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => provider.loadTeams(),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: provider.teams.length,
        itemBuilder: (context, index) {
          final team = provider.teams[index];
          return ListTile(
            leading: CircleAvatar(
              child: Text(team.name.isNotEmpty ? team.name[0].toUpperCase() : '?'),
            ),
            title: Text(team.name),
            subtitle: Text('${team.memberIds.length} member(s)'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.go('/teams/${team.id}/vehicles'),
            onLongPress: () => _showDeleteDialog(context, team.id, team.name),
          );
        },
      ),
    );
  }

  Future<void> _showCreateDialog(BuildContext context) async {
    final controller = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Create Team'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Team name',
            hintText: 'e.g. My Family Cars',
          ),
          onSubmitted: (v) => Navigator.pop(ctx, v),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text),
            child: const Text('Create'),
          ),
        ],
      ),
    );

    if (name != null && name.trim().isNotEmpty && context.mounted) {
      await context.read<TeamProvider>().createTeam(name.trim());
    }
  }

  Future<void> _showDeleteDialog(
      BuildContext context, String id, String name) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Team'),
        content: Text('Delete "$name" and all its vehicles?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(ctx).colorScheme.error,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      await context.read<TeamProvider>().deleteTeam(id);
    }
  }
}
