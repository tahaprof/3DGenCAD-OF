from django.core.management.base import BaseCommand
from users_app.models import User
from assets_app.models import Asset, AssetCategory


class Command(BaseCommand):
    help = 'Seed the database with initial demo data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')

        # ── Users ──────────────────────────────────────────────────────────────
        users_data = [
            {'employee_id': 'EMP001', 'email': 'admin@frl.dz',      'first_name': 'Alice',   'last_name': 'Admin',   'role': 'Admin',       'password': 'Admin@1234'},
            {'employee_id': 'EMP002', 'email': 'manager@frl.dz',    'first_name': 'Bob',     'last_name': 'Manager', 'role': 'Manager',     'password': 'Admin@1234'},
            {'employee_id': 'EMP003', 'email': 'tech@frl.dz',       'first_name': 'Charlie', 'last_name': 'Tech',    'role': 'Technician',  'password': 'Admin@1234'},
            {'employee_id': 'EMP004', 'email': 'viewer@frl.dz',     'first_name': 'David',   'last_name': 'Viewer',  'role': 'Viewer',      'password': 'Admin@1234'},
        ]
        created_users = {}
        for u in users_data:
            obj, created = User.objects.get_or_create(employee_id=u['employee_id'], defaults={
                'email':      u['email'],
                'first_name': u['first_name'],
                'last_name':  u['last_name'],
                'role':       u['role'],
            })
            if created:
                obj.set_password(u['password'])
                obj.save()
                self.stdout.write(f'  Created user: {obj.employee_id} ({obj.email})')
            created_users[u['role']] = obj

        admin = created_users.get('Admin')

        # ── Categories ─────────────────────────────────────────────────────────
        categories = ['Rotating Equipment', 'Static Equipment', 'Instrumentation', 'Electrical', 'Piping']
        cat_objs = {}
        for name in categories:
            cat, _ = AssetCategory.objects.get_or_create(name=name, defaults={'created_by': admin})
            cat_objs[name] = cat
            self.stdout.write(f'  Category: {name}')

        # ── Assets ─────────────────────────────────────────────────────────────
        assets_data = [
            {'reference': 'AST-1045', 'tag': 'V-201',   'description': '3-Phase Production Separator',  'site': 'Hassi Messaoud',   'system': 'Gas Treatment', 'category': 'Static Equipment',   'criticality': 'High',     'stage': 'Operational',   'health': 78,  'equipment_type': 'Vessel',                     'manufacturer': 'TechnipFMC',              'serial_number': 'TFM-2017-V0421'},
            {'reference': 'AST-1046', 'tag': 'P-105A',  'description': 'Main Export Pump',              'site': 'Hassi Messaoud',   'system': 'Oil Export',    'category': 'Rotating Equipment', 'criticality': 'Critical', 'stage': 'Maintenance',   'health': 45,  'equipment_type': 'Centrifugal Pump',           'manufacturer': 'Sulzer',                  'serial_number': 'SLZ-2016-P1054'},
            {'reference': 'AST-1047', 'tag': 'HE-302',  'description': 'Gas Cooler Unit',               'site': 'Rhourde El Baguel','system': 'Cooling',       'category': 'Static Equipment',   'criticality': 'Medium',   'stage': 'Procurement',   'health': 100, 'equipment_type': 'Shell & Tube Heat Exchanger','manufacturer': 'Alfa Laval',              'serial_number': 'AL-2025-HE302'},
            {'reference': 'AST-1048', 'tag': 'C-401',   'description': 'Sales Gas Compressor',          'site': "Hassi R'Mel",      'system': 'Compression',   'category': 'Rotating Equipment', 'criticality': 'Critical', 'stage': 'Commissioning', 'health': 95,  'equipment_type': 'Centrifugal Compressor',     'manufacturer': 'Baker Hughes',            'serial_number': 'BH-2025-C4011'},
            {'reference': 'AST-1049', 'tag': 'T-501',   'description': 'Crude Storage Tank',            'site': 'Arzew Terminal',   'system': 'Storage',       'category': 'Static Equipment',   'criticality': 'High',     'stage': 'Operational',   'health': 88,  'equipment_type': 'Floating Roof Tank',         'manufacturer': 'CB&I (McDermott)',        'serial_number': 'CBI-2012-T5010'},
        ]
        for a in assets_data:
            cat_name = a.pop('category')
            obj, created = Asset.objects.get_or_create(reference=a['reference'], defaults={
                **a,
                'category':   cat_objs.get(cat_name),
                'created_by': admin,
            })
            if created:
                self.stdout.write(f'  Created asset: {obj.reference} — {obj.tag}')

        self.stdout.write(self.style.SUCCESS('\nDatabase seeded successfully!'))
        self.stdout.write('   Login credentials (all use password: Admin@1234):')
        self.stdout.write('   EMP001 -> Admin')
        self.stdout.write('   EMP002 -> Manager')
        self.stdout.write('   EMP003 -> Technician')
        self.stdout.write('   EMP004 -> Viewer')
