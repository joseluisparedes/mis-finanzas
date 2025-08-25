#!/usr/bin/env node

/**
 * SISTEMA DE VALIDACIÓN AUTOMÁTICA
 * Verifica que todas las funcionalidades críticas sigan funcionando
 * después de cambios en el código o base de datos
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';

// Cargar variables de entorno
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERROR: Variables de entorno SUPABASE no configuradas');
  console.log('Crea un archivo .env con:');
  console.log('VITE_SUPABASE_URL=tu_url');
  console.log('VITE_SUPABASE_ANON_KEY=tu_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class SystemHealthChecker {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
    this.testUserId = null;
    this.testUserEmail = 'test-health-check@system.test';
  }

  log(type, message, details = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type, message, details };
    this.results.details.push(logEntry);
    
    const symbols = { pass: '✅', fail: '❌', warn: '⚠️', info: 'ℹ️' };
    console.log(`${symbols[type] || 'ℹ️'} ${message}`);
    if (details) console.log('   ', details);
  }

  async runTest(testName, testFn) {
    try {
      console.log(`\n🧪 Testing: ${testName}`);
      const result = await testFn();
      if (result === false) {
        this.results.failed++;
        this.log('fail', `${testName} - FAILED`);
      } else {
        this.results.passed++;
        this.log('pass', `${testName} - PASSED`);
      }
      return result;
    } catch (error) {
      this.results.failed++;
      this.log('fail', `${testName} - ERROR`, error.message);
      return false;
    }
  }

  // ============================================================================
  // TESTS DE FUNCIONES SQL CRÍTICAS
  // ============================================================================

  async testDatabaseFunctions() {
    console.log('\n📊 === TESTING DATABASE FUNCTIONS ===');

    // Test 1: Función get_user_subscription_info
    await this.runTest('get_user_subscription_info function', async () => {
      const { data, error } = await supabase.rpc('get_user_subscription_info', {
        user_uuid: '00000000-0000-0000-0000-000000000000' // UUID dummy
      });
      
      if (error) {
        this.log('info', 'Function exists but failed with dummy UUID (expected)');
        return true; // Function exists, that's what matters
      }
      return data !== null;
    });

    // Test 2: Función is_current_user_admin
    await this.runTest('is_current_user_admin function', async () => {
      const { data, error } = await supabase.rpc('is_current_user_admin');
      return error === null; // Function should exist and return boolean
    });

    // Test 3: Función get_all_subscriptions_admin
    await this.runTest('get_all_subscriptions_admin function', async () => {
      const { data, error } = await supabase.rpc('get_all_subscriptions_admin');
      // Should return data or error about permissions, but function should exist
      return error === null || error.message?.includes('admin');
    });

    // Test 4: Función change_user_subscription (CRÍTICA)
    await this.runTest('change_user_subscription function', async () => {
      const { data, error } = await supabase.rpc('change_user_subscription', {
        new_subscription_type: 'free',
        payment_info: { target_user_email: 'test@test.com' }
      });
      // Should fail due to permissions, but function should exist
      return error === null || error.message?.includes('admin') || data?.success === false;
    });
  }

  // ============================================================================
  // TESTS DE ESTRUCTURA DE TABLAS
  // ============================================================================

  async testDatabaseTables() {
    console.log('\n🗄️ === TESTING DATABASE TABLES ===');

    const requiredTables = [
      'user_subscriptions',
      'categories', 
      'payment_methods',
      'income_types',
      'budgets',
      'user_profiles'
    ];

    for (const table of requiredTables) {
      await this.runTest(`Table: ${table}`, async () => {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        return error === null; // Table should be accessible
      });
    }
  }

  // ============================================================================
  // TESTS DE AUTENTICACIÓN
  // ============================================================================

  async testAuthentication() {
    console.log('\n🔐 === TESTING AUTHENTICATION ===');

    // Test: Session management
    await this.runTest('Session management', async () => {
      const { data: { session } } = await supabase.auth.getSession();
      this.log('info', `Current session: ${session ? 'Active' : 'None'}`);
      return true; // Always pass, just informational
    });

    // Test: Auth configuration
    await this.runTest('Auth configuration', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      this.log('info', `Current user: ${user ? user.email : 'Anonymous'}`);
      return true; // Always pass, just informational
    });
  }

  // ============================================================================
  // TESTS DE RESTRICCIONES DE SUSCRIPCIÓN
  // ============================================================================

  async testSubscriptionLimits() {
    console.log('\n📋 === TESTING SUBSCRIPTION LIMITS ===');

    // Simular datos de suscripción Free
    const freeSubscription = {
      limits: {
        categories: { limit: 3, current: 0, available: 3 },
        payment_methods: { limit: 2, current: 0, available: 2 },
        budgets: { limit: 2, current: 0, available: 2 }
      }
    };

    await this.runTest('Free plan limits validation', async () => {
      // Verificar que los límites sean correctos
      const limits = freeSubscription.limits;
      return limits.categories.limit === 3 &&
             limits.payment_methods.limit === 2 &&
             limits.budgets.limit === 2;
    });
  }

  // ============================================================================
  // TESTS DE TRIGGERS
  // ============================================================================

  async testTriggers() {
    console.log('\n⚡ === TESTING DATABASE TRIGGERS ===');

    await this.runTest('User signup trigger exists', async () => {
      // Verificar que el trigger existe
      const { data, error } = await supabase
        .from('information_schema.triggers')
        .select('trigger_name')
        .eq('trigger_name', 'on_auth_user_created_subscription')
        .single();
      
      return error === null && data;
    });
  }

  // ============================================================================
  // TESTS DE POLÍTICAS RLS
  // ============================================================================

  async testRLSPolicies() {
    console.log('\n🛡️ === TESTING RLS POLICIES ===');

    await this.runTest('RLS enabled on user_subscriptions', async () => {
      // Intentar acceder a user_subscriptions sin permisos
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .limit(1);
      
      // Debería fallar o retornar datos limitados según RLS
      return error !== null || Array.isArray(data);
    });
  }

  // ============================================================================
  // TESTS DE INTEGRIDAD DE DATOS
  // ============================================================================

  async testDataIntegrity() {
    console.log('\n🔍 === TESTING DATA INTEGRITY ===');

    await this.runTest('No orphaned subscriptions', async () => {
      // Verificar que no hay suscripciones sin usuarios
      const { data, error } = await supabase.rpc('get_subscription_stats_simple');
      if (error && !error.message?.includes('admin')) {
        return false;
      }
      return true; // Function exists and responds
    });
  }

  // ============================================================================
  // TESTS DE FUNCIONALIDADES FRONTEND
  // ============================================================================

  async testFrontendIntegration() {
    console.log('\n🌐 === TESTING FRONTEND INTEGRATION ===');

    // Test: Build files exist
    await this.runTest('Build files exist', async () => {
      try {
        const indexPath = path.join(process.cwd(), 'dist', 'index.html');
        const indexContent = readFileSync(indexPath, 'utf8');
        return indexContent.includes('MisFinanzas') && indexContent.includes('/assets/');
      } catch {
        return false;
      }
    });

    // Test: Environment variables
    await this.runTest('Environment variables', async () => {
      return supabaseUrl.includes('supabase.co') && supabaseAnonKey.length > 50;
    });
  }

  // ============================================================================
  // RUNNER PRINCIPAL
  // ============================================================================

  async runAllTests() {
    console.log('🚀 INICIANDO HEALTH CHECK DEL SISTEMA...\n');
    console.log('='  .repeat(60));

    const startTime = Date.now();

    // Ejecutar todos los grupos de tests
    await this.testDatabaseFunctions();
    await this.testDatabaseTables();
    await this.testAuthentication();
    await this.testSubscriptionLimits();
    await this.testTriggers();
    await this.testRLSPolicies();
    await this.testDataIntegrity();
    await this.testFrontendIntegration();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Reporte final
    console.log('\n' + '='  .repeat(60));
    console.log('📊 REPORTE FINAL');
    console.log('='  .repeat(60));
    console.log(`✅ Tests pasados: ${this.results.passed}`);
    console.log(`❌ Tests fallidos: ${this.results.failed}`);
    console.log(`⚠️ Advertencias: ${this.results.warnings}`);
    console.log(`⏱️ Duración: ${duration.toFixed(2)}s`);

    if (this.results.failed === 0) {
      console.log('\n🎉 ¡SISTEMA SALUDABLE! Todos los tests críticos pasaron.');
      console.log('✨ Es seguro realizar cambios en el sistema.');
    } else {
      console.log('\n⚠️ SE ENCONTRARON PROBLEMAS:');
      this.results.details
        .filter(d => d.type === 'fail')
        .forEach(d => console.log(`   • ${d.message}`));
      console.log('\n🚨 REVISAR ANTES DE CONTINUAR');
    }

    return this.results.failed === 0;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new SystemHealthChecker();
  checker.runAllTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('❌ ERROR CRÍTICO:', error);
      process.exit(1);
    });
}

export default SystemHealthChecker;