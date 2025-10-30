"""
Test pour mesurer l'impact du pruning précoce sur les performances
"""

import time
from algo7 import LayerClassifier

# Test 1: Petit graphe (devrait converger rapidement)
print("="*80)
print("TEST 1: Petit graphe (10 entités)")
print("="*80)

relations_small = [
    ('A', 'B'),
    ('B', 'C'),
    ('C', 'D'),
    ('D', 'E'),
    ('E', 'F'),
    ('F', 'G'),
    ('G', 'H'),
    ('H', 'I'),
    ('I', 'J'),
]

start = time.time()
classifier_small = LayerClassifier()
for left, right in relations_small:
    classifier_small.add_relation(left, right)
end = time.time()

print(f"Temps d'exécution: {(end - start) * 1000:.2f} ms")
print(f"Nombre d'entités: {len(classifier_small.entities)}")
print(f"Nombre de distances calculées: {len(classifier_small.distances)}")
print(f"Plus longue distance: {max(classifier_small.distances.values())}")


# Test 2: Graphe moyen avec branches (CRM dataset)
print("\n" + "="*80)
print("TEST 2: Graphe CRM (30 entités, 44 relations)")
print("="*80)

relations_crm = [
    ('user_roles', 'users'),
    ('team_members', 'teams'),
    ('team_members', 'users'),
    ('teams', 'users'),
    ('accounts', 'users'),
    ('contacts', 'accounts'),
    ('contacts_accounts', 'contacts'),
    ('contacts_accounts', 'accounts'),
    ('leads', 'campaigns'),
    ('leads', 'users'),
    ('campaign_members', 'campaigns'),
    ('campaign_members', 'contacts'),
    ('campaign_members', 'leads'),
    ('opportunities', 'accounts'),
    ('opportunities', 'contacts'),
    ('opportunities', 'users'),
    ('opportunity_products', 'opportunities'),
    ('quotes', 'accounts'),
    ('quotes', 'opportunities'),
    ('orders', 'quotes'),
    ('orders', 'accounts'),
    ('invoices', 'orders'),
    ('invoices', 'accounts'),
    ('payments', 'invoices'),
    ('payments', 'accounts'),
    ('activities', 'users'),
    ('activity_assignments', 'activities'),
    ('activity_assignments', 'users'),
    ('cases', 'accounts'),
    ('cases', 'contacts'),
    ('cases', 'users'),
    ('notes', 'users'),
    ('attachments', 'users'),
    ('accounts', 'attachments'),
    ('audit_logs', 'users'),
    ('api_keys', 'users'),
    ('users', 'profiles'),
    ('users', 'teams'),
    ('roles', 'users'),
    ('user_roles', 'roles'),
    ('role_permissions', 'roles'),
    ('role_permissions', 'permissions'),
    ('emails', 'accounts'),
    ('pipelines', 'accounts'),
]

start = time.time()
classifier_crm = LayerClassifier()
for left, right in relations_crm:
    classifier_crm.add_relation(left, right)
end = time.time()

print(f"Temps d'exécution: {(end - start) * 1000:.2f} ms")
print(f"Nombre d'entités: {len(classifier_crm.entities)}")
print(f"Nombre de distances calculées: {len(classifier_crm.distances)}")
print(f"Plus longue distance: {max(classifier_crm.distances.values())}")


# Test 3: Graphe dense (beaucoup d'intercalations)
print("\n" + "="*80)
print("TEST 3: Graphe dense avec chaînes complexes")
print("="*80)

# Créer un graphe en diamant répété (force beaucoup d'intercalations)
relations_dense = []
for i in range(5):  # 5 diamants
    base = i * 4
    # Créer un diamant: A -> B, A -> C, B -> D, C -> D
    relations_dense.append((f'N{base}', f'N{base+1}'))
    relations_dense.append((f'N{base}', f'N{base+2}'))
    relations_dense.append((f'N{base+1}', f'N{base+3}'))
    relations_dense.append((f'N{base+2}', f'N{base+3}'))
    # Connecter au diamant suivant
    if i < 4:
        relations_dense.append((f'N{base+3}', f'N{base+4}'))

start = time.time()
classifier_dense = LayerClassifier()
for left, right in relations_dense:
    classifier_dense.add_relation(left, right)
end = time.time()

print(f"Temps d'exécution: {(end - start) * 1000:.2f} ms")
print(f"Nombre d'entités: {len(classifier_dense.entities)}")
print(f"Nombre de relations: {len(relations_dense)}")
print(f"Nombre de distances calculées: {len(classifier_dense.distances)}")
print(f"Plus longue distance: {max(classifier_dense.distances.values())}")


# Analyse de l'efficacité du pruning
print("\n" + "="*80)
print("ANALYSE DE L'EFFICACITÉ DU PRUNING")
print("="*80)

print("\nLe pruning précoce permet d'arrêter Floyd-Warshall dès que:")
print("  - Aucune distance ne change pendant une passe complète")
print("  - L'algorithme a convergé vers les distances maximales")
print("\nAvantages:")
print("  ✓ Évite des itérations inutiles sur des graphes peu denses")
print("  ✓ Converge rapidement sur des chaînes linéaires")
print("  ✓ Réduit la complexité pratique (même si O(n³) reste le pire cas)")
print("\nLe nombre maximal d'itérations est limité au nombre d'entités,")
print("garantissant que l'algorithme termine toujours.")
